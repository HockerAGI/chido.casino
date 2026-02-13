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
    m.includes("fondos insuficientes")
  );
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

  // 2) Debitar apuesta (balance -> locked)
  const refId = `cr_${session.user.id}_${Date.now()}`;
  const deb = await walletApplyDelta(supabaseAdmin, {
    userId: session.user.id,
    deltaBalance: -betAmount,
    deltaBonus: 0,
    deltaLocked: betAmount,
    currency: "MXN",
    refId,
    reason: "crash_bet",
  });

  if (deb.error) {
    const msg = String(deb.error || "");
    if (isInsufficient(msg)) {
      return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });
    }
    return NextResponse.json({ error: "WALLET_ERROR" }, { status: 500 });
  }

  // 3) Provably fair (seed por jugada)
  const serverSeed = generateServerSeed();
  const seedHash = serverSeedHash(serverSeed);

  // Derivamos un random determinístico (serverSeed + refId)
  const r = fairFloat(serverSeed, `client:${refId}`);

  // Crash multiplier (misma lógica que traías)
  let crashMultiplier = Math.max(1, Math.floor(100 / (1 - r)) / 100);
  if (crashMultiplier === 100) crashMultiplier = 1;

  const didCashout = targetMultiplier <= crashMultiplier;
  const payout = didCashout ? Math.floor(betAmount * targetMultiplier) : 0;

  // 4) Persistir bet
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
      server_seed: serverSeed, // si luego quieres ocultarlo y revelarlo después, lo ajustamos
    })
    .select("*")
    .single();

  if (betErr) {
    // si falló DB, al menos desbloquea saldo para no dejar “locked” colgado
    await walletApplyDelta(supabaseAdmin, {
      userId: session.user.id,
      deltaBalance: betAmount,
      deltaBonus: 0,
      deltaLocked: -betAmount,
      currency: "MXN",
      refId: `cr_refund_${refId}`,
      reason: "crash_db_fail_refund",
    });

    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  // 5) Resolver resultado en wallet:
  // - siempre liberar locked (-betAmount)
  // - si ganó: pagar payout (+payout)
  const settle = await walletApplyDelta(supabaseAdmin, {
    userId: session.user.id,
    deltaBalance: payout,
    deltaBonus: 0,
    deltaLocked: -betAmount,
    currency: "MXN",
    refId: `cr_settle_${refId}`,
    reason: didCashout ? "crash_cashout" : "crash_bust",
    metadata: { betId: betRow?.id ?? null },
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
    serverSeedHash: seedHash,
    serverSeed,
    refId,
  });
}