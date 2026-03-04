export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSession } from "@/lib/session";
import { walletApplyDelta } from "@/lib/walletApplyDelta";
import { fairFloat, generateServerSeed, serverSeedHash } from "@/lib/provablyFair";
import { promoWageringProgress } from "@/lib/promoWagering";

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}
function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
function isInsufficient(msg: string) {
  const m = (msg || "").toLowerCase();
  return m.includes("insufficient") || m.includes("saldo") || m.includes("balance") || m.includes("not enough");
}

async function spendAndLock(userId: string, betAmount: number, refId: string) {
  // 1) intenta saldo real
  const a = await walletApplyDelta(supabaseAdmin as any, {
    userId,
    deltaBalance: -betAmount,
    deltaBonus: 0,
    deltaLocked: betAmount,
    reason: "crash_bet_balance",
    refId,
  });

  if (!a.error) return { source: "balance" as const };

  if (!isInsufficient(String(a.error || ""))) {
    return { source: "error" as const, error: "WALLET_ERROR" };
  }

  // 2) intenta saldo bono
  const b = await walletApplyDelta(supabaseAdmin as any, {
    userId,
    deltaBalance: 0,
    deltaBonus: -betAmount,
    deltaLocked: betAmount,
    reason: "crash_bet_bonus",
    refId,
  });

  if (!b.error) return { source: "bonus" as const };

  if (isInsufficient(String(b.error || ""))) {
    return { source: "error" as const, error: "Saldo insuficiente" };
  }
  return { source: "error" as const, error: "WALLET_ERROR" };
}

async function refundAndUnlock(userId: string, betAmount: number, refId: string, source: "balance" | "bonus") {
  return walletApplyDelta(supabaseAdmin as any, {
    userId,
    deltaBalance: source === "balance" ? +betAmount : 0,
    deltaBonus: source === "bonus" ? +betAmount : 0,
    deltaLocked: -betAmount,
    reason: "crash_refund",
    refId: `cr_refund_${refId}`,
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const betAmount = Number(body?.betAmount ?? body?.bet ?? 0);
  const targetMultiplier = Number(body?.targetMultiplier ?? body?.cashoutAt ?? body?.multiplier ?? 0);

  if (!Number.isFinite(betAmount) || betAmount <= 0) {
    return NextResponse.json({ error: "Apuesta inválida" }, { status: 400 });
  }
  if (!Number.isFinite(targetMultiplier) || targetMultiplier < 1.01 || targetMultiplier > 1000) {
    return NextResponse.json({ error: "Auto-cashout inválido" }, { status: 400 });
  }

  const refId = `cr_${session.user.id}_${Date.now()}`;

  // Debita y bloquea (balance o bonus)
  const spent = await spendAndLock(session.user.id, betAmount, refId);
  if (spent.source === "error") {
    return NextResponse.json({ error: spent.error }, { status: 400 });
  }

  // House edge configurable (2% default)
  const edgeBpsRaw = Number(process.env.CRASH_HOUSE_EDGE_BPS ?? 200);
  const edgeBps = clamp(Number.isFinite(edgeBpsRaw) ? edgeBpsRaw : 200, 0, 5000);
  const houseFactor = 1 - edgeBps / 10000;

  // Provably fair
  const serverSeed = generateServerSeed();
  const seedHash = serverSeedHash(serverSeed);
  const r = clamp(fairFloat(serverSeed, `client:${refId}`, 0), 0, 0.999999999);

  let crashMultiplier = Math.floor((houseFactor / (1 - r)) * 100) / 100;
  if (!Number.isFinite(crashMultiplier) || crashMultiplier < 1) crashMultiplier = 1.0;
  if (crashMultiplier > 1000000) crashMultiplier = 1000000;

  const didCashout = targetMultiplier <= crashMultiplier;
  const payout = didCashout ? round2(betAmount * targetMultiplier) : 0;

  // Guardar apuesta
  const { data: betRow, error: betErr } = await supabaseAdmin
    .from("crash_bets")
    .insert({
      user_id: session.user.id,
      bet_amount: betAmount,
      target_multiplier: targetMultiplier,
      crash_multiplier: crashMultiplier,
      did_cashout: didCashout,
      payout,
      ref_id: refId,
      server_seed_hash: seedHash,
      server_seed: serverSeed,
    })
    .select("id")
    .single();

  if (betErr) {
    await refundAndUnlock(session.user.id, betAmount, refId, spent.source);
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  // Resolver wallet: desbloquea + paga (payout a BALANCE real)
  const settle = await walletApplyDelta(supabaseAdmin as any, {
    userId: session.user.id,
    deltaBalance: payout,
    deltaBonus: 0,
    deltaLocked: -betAmount,
    reason: didCashout ? "crash_cashout" : "crash_bust",
    refId: `cr_settle_${refId}`,
  });

  if (settle.error) {
    // si algo truena aquí, al menos desbloqueamos (best-effort)
    await walletApplyDelta(supabaseAdmin as any, {
      userId: session.user.id,
      deltaBalance: 0,
      deltaBonus: 0,
      deltaLocked: -betAmount,
      reason: "crash_unlock_fail_safe",
      refId: `cr_unlock_${refId}`,
    });
    return NextResponse.json({ error: "WALLET_SETTLE_ERROR" }, { status: 500 });
  }

  // Avanza rollover promo (si hay)
  await promoWageringProgress(supabaseAdmin as any, {
    userId: session.user.id,
    wagerAmount: betAmount,
    wagerRef: `crash:${refId}`,
    game: "crash",
  });

  return NextResponse.json({
    ok: true,
    crashMultiplier,
    targetMultiplier,
    didCashout,
    payout,
    houseEdgeBps: edgeBps,
    serverSeedHash: seedHash,
    serverSeed,
    refId,
    betId: betRow?.id ?? null,
  });
}