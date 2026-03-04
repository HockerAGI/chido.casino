// src/app/api/games/crash/play/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSession } from "@/lib/session";
import { walletApplyDelta } from "@/lib/walletApplyDelta";
import { fairFloat, generateServerSeed, serverSeedHash } from "@/lib/provablyFair";

function isInsufficient(msg: string) {
  const m = (msg || "").toLowerCase();
  return (
    m.includes("insufficient") ||
    m.includes("saldo insuficiente") ||
    m.includes("not enough") ||
    m.includes("fondos insuficientes") ||
    m.includes("balance")
  );
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export async function POST(req: Request) {
  // 0) Auth
  const session = await getServerSession(req);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  // 1) Body
  const body = await req.json().catch(() => ({} as any));
  const betAmount = Number(body?.betAmount ?? body?.bet ?? 0);
  const targetMultiplier = Number(body?.targetMultiplier ?? body?.cashoutAt ?? body?.multiplier ?? 0);

  if (!Number.isFinite(betAmount) || betAmount <= 0) {
    return NextResponse.json({ error: "Apuesta inválida" }, { status: 400 });
  }

  if (!Number.isFinite(targetMultiplier) || targetMultiplier < 1.01 || targetMultiplier > 1000) {
    return NextResponse.json({ error: "Cashout inválido" }, { status: 400 });
  }

  // 2) Debitar apuesta + lock
  const refId = `cr_${session.user.id}_${Date.now()}`;

  const deb = await walletApplyDelta(supabaseAdmin, {
    userId: session.user.id,
    deltaBalance: -betAmount,
    deltaBonus: 0,
    deltaLocked: betAmount,
    currency: "MXN",
    refId,
    reason: "crash_bet",
    metadata: { game: "crash" },
  });

  if (deb.error) {
    const msg = String(deb.error || "");
    if (isInsufficient(msg)) {
      return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });
    }
    return NextResponse.json({ error: "WALLET_ERROR" }, { status: 500 });
  }

  // 3) Provably fair + Crash point con edge configurable
  // Edge en basis points (bps). 200 bps = 2%
  const edgeBpsRaw = Number(process.env.CRASH_HOUSE_EDGE_BPS ?? 200);
  const edgeBps = clamp(Number.isFinite(edgeBpsRaw) ? edgeBpsRaw : 200, 0, 5000);
  const houseFactor = 1 - edgeBps / 10000; // 0.98 default

  const serverSeed = generateServerSeed();
  const seedHash = serverSeedHash(serverSeed);

  const r = clamp(fairFloat(serverSeed, `client:${refId}`, 0), 0, 0.999999999);

  // Fórmula: (houseFactor / (1-r)) redondeado a 2 decimales, mínimo 1.00
  let crashMultiplier = Math.floor((houseFactor / (1 - r)) * 100) / 100;
  if (!Number.isFinite(crashMultiplier) || crashMultiplier < 1) crashMultiplier = 1.0;
  if (crashMultiplier > 1000000) crashMultiplier = 1000000;

  const didCashout = targetMultiplier <= crashMultiplier;
  const payout = didCashout ? round2(betAmount * targetMultiplier) : 0;

  // 4) Persistir bet (tabla real del repo)
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
      server_seed: serverSeed, // reveal (verificable)
      metadata: { house_edge_bps: edgeBps },
    })
    .select("*")
    .single();

  if (betErr) {
    // rollback bet
    await walletApplyDelta(supabaseAdmin, {
      userId: session.user.id,
      deltaBalance: betAmount,
      deltaBonus: 0,
      deltaLocked: -betAmount,
      currency: "MXN",
      refId: `cr_refund_${refId}`,
      reason: "crash_db_fail_refund",
      metadata: { why: "insert_failed" },
    });

    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  // 5) Resolver resultado en wallet
  const settle = await walletApplyDelta(supabaseAdmin, {
    userId: session.user.id,
    deltaBalance: payout,
    deltaBonus: 0,
    deltaLocked: -betAmount,
    currency: "MXN",
    refId: `cr_settle_${refId}`,
    reason: didCashout ? "crash_cashout" : "crash_bust",
    metadata: { betId: betRow?.id ?? null, house_edge_bps: edgeBps },
  });

  if (settle.error) {
    return NextResponse.json({ error: "WALLET_SETTLE_ERROR" }, { status: 500 });
  }

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
  });
}