export const runtime = "nodejs";

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSession } from "@/lib/session";
import { fairFloat, generateServerSeed, serverSeedHash } from "@/lib/provablyFair";
import { getPromoLimitState } from "@/lib/promoLimits";
import { assertGamesNotPaused } from "@/lib/gamesPaused";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function safeRequestKey(value: unknown) {
  const candidate = String(value || "").trim();
  return /^[a-zA-Z0-9:_-]{8,128}$/.test(candidate) ? candidate : randomUUID();
}

function isInsufficientFunds(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("insufficient") || normalized.includes("saldo") || normalized.includes("funds");
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const paused = await assertGamesNotPaused();
    if (paused) return paused;

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const betAmount = roundMoney(Number(body?.betAmount ?? body?.bet ?? 0));
    const targetMultiplier = Number(body?.targetMultiplier ?? body?.cashoutAt ?? body?.multiplier ?? 0);

    if (!Number.isFinite(betAmount) || betAmount <= 0) {
      return NextResponse.json({ error: "INVALID_BET" }, { status: 400 });
    }
    if (!Number.isFinite(targetMultiplier) || targetMultiplier < 1.01 || targetMultiplier > 1000) {
      return NextResponse.json({ error: "INVALID_AUTO_CASHOUT" }, { status: 400 });
    }

    const promoState = await getPromoLimitState(supabaseAdmin as any, session.user.id);
    if (promoState.ok && promoState.hasRollover && betAmount > promoState.maxBet) {
      return NextResponse.json(
        {
          error: "PROMO_MAX_BET",
          message: `Con bono activo, la apuesta máxima es ${promoState.maxBet} MXN.`,
          maxBet: promoState.maxBet,
          required: promoState.required,
          progress: promoState.progress,
        },
        { status: 400 }
      );
    }

    const requestKey = safeRequestKey(req.headers.get("idempotency-key") || body?.requestId);
    const refId = `cr_${session.user.id}_${requestKey}`;
    const edgeBpsRaw = Number(process.env.CRASH_HOUSE_EDGE_BPS ?? 200);
    const edgeBps = clamp(Number.isFinite(edgeBpsRaw) ? edgeBpsRaw : 200, 0, 5000);
    const houseFactor = 1 - edgeBps / 10000;

    const serverSeed = generateServerSeed();
    const seedHash = serverSeedHash(serverSeed);
    const random = clamp(fairFloat(serverSeed, `client:${refId}`, 0), 0, 0.999999999);
    let crashMultiplier = Math.floor((houseFactor / (1 - random)) * 100) / 100;
    if (!Number.isFinite(crashMultiplier) || crashMultiplier < 1) crashMultiplier = 1;
    crashMultiplier = Math.min(crashMultiplier, 1_000_000);

    const didCashout = targetMultiplier <= crashMultiplier;
    const payout = didCashout ? roundMoney(betAmount * targetMultiplier) : 0;

    const { data: settlement, error: settlementError } = await supabaseAdmin.rpc("casino_settle_crash", {
      p_user_id: session.user.id,
      p_round_ref: refId,
      p_bet_amount: betAmount,
      p_target_multiplier: targetMultiplier,
      p_crash_multiplier: crashMultiplier,
      p_did_cashout: didCashout,
      p_payout_amount: payout,
      p_server_seed_hash: seedHash,
      p_server_seed: serverSeed,
      p_metadata: { house_edge_bps: edgeBps },
    });

    if (settlementError) {
      if (isInsufficientFunds(settlementError.message)) {
        return NextResponse.json({ error: "INSUFFICIENT_FUNDS" }, { status: 400 });
      }
      console.error("Crash atomic settlement failed", settlementError);
      return NextResponse.json({ error: "SETTLEMENT_FAILED" }, { status: 500 });
    }

    const result = (settlement || {}) as Record<string, any>;
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
      betId: result.bet_id ?? null,
      idempotent: Boolean(result.idempotent),
      rollover: result.effects?.rollover ?? null,
    });
  } catch (error) {
    console.error("Crash play error", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
