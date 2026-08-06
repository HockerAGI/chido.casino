export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSession } from "@/lib/session";
import {
  fairFloat,
  generateServerSeed,
  serverSeedHash,
} from "@/lib/provablyFair";
import { getPromoLimitState } from "@/lib/promoLimits";
import { getSelfExclusionState } from "@/lib/responsibleGaming";
import { assertGamesNotPaused } from "@/lib/gamesPaused";

type PersistedCrash = {
  id?: string | null;
  bet_id?: string | null;
  ref_id?: string | null;
  round_ref?: string | null;
  bet_amount?: number | string | null;
  target_multiplier?: number | string | null;
  crash_multiplier?: number | string | null;
  did_cashout?: boolean | null;
  payout?: number | string | null;
  payout_amount?: number | string | null;
  server_seed_hash?: string | null;
  server_seed?: string | null;
  metadata?: Record<string, unknown> | null;
  effects?: Record<string, unknown> | null;
  idempotent?: boolean;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function requestKey(value: unknown) {
  const candidate = String(value || "").trim();
  return /^[a-zA-Z0-9:_-]{8,128}$/.test(candidate) ? candidate : null;
}

function includesError(message: string, code: string) {
  return message.toUpperCase().includes(code);
}

function settlementFailure(message: string) {
  if (
    includesError(message, "INSUFFICIENT_FUNDS") ||
    message.toLowerCase().includes("saldo")
  ) {
    return NextResponse.json(
      { ok: false, error: "INSUFFICIENT_FUNDS" },
      { status: 400 }
    );
  }
  if (includesError(message, "SELF_EXCLUDED")) {
    return NextResponse.json(
      { ok: false, error: "SELF_EXCLUDED" },
      { status: 403 }
    );
  }
  if (includesError(message, "KYC_REQUIRED")) {
    return NextResponse.json(
      { ok: false, error: "KYC_REQUIRED" },
      { status: 403 }
    );
  }
  if (
    includesError(message, "GAMES_PAUSED") ||
    includesError(message, "GAME_CONTROL_MISSING")
  ) {
    return NextResponse.json(
      { ok: false, error: "GAMES_PAUSED" },
      { status: 503 }
    );
  }
  if (includesError(message, "ROUND_REF_CONFLICT")) {
    return NextResponse.json(
      { ok: false, error: "ROUND_REF_CONFLICT" },
      { status: 409 }
    );
  }
  return NextResponse.json(
    { ok: false, error: "SETTLEMENT_FAILED" },
    { status: 500 }
  );
}

function crashResponse(result: PersistedCrash) {
  const roundRef = result.round_ref || result.ref_id;
  const betAmount = roundMoney(Number(result.bet_amount));
  const targetMultiplier = Number(result.target_multiplier);
  const crashMultiplier = Number(result.crash_multiplier);
  const payout = roundMoney(
    Number(result.payout_amount ?? result.payout ?? Number.NaN)
  );
  const didCashout = Boolean(result.did_cashout);
  const metadata = result.metadata || {};
  const houseEdgeBps = Number(metadata.house_edge_bps ?? 200);

  if (
    !roundRef ||
    !Number.isFinite(betAmount) ||
    betAmount <= 0 ||
    !Number.isFinite(targetMultiplier) ||
    targetMultiplier < 1.01 ||
    !Number.isFinite(crashMultiplier) ||
    crashMultiplier < 1 ||
    !Number.isFinite(payout) ||
    payout < 0 ||
    !result.server_seed_hash ||
    !result.server_seed
  ) {
    return NextResponse.json(
      { ok: false, error: "PERSISTED_CRASH_INVALID" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    crashMultiplier,
    targetMultiplier,
    didCashout,
    payout,
    houseEdgeBps: Number.isFinite(houseEdgeBps) ? houseEdgeBps : 200,
    serverSeedHash: result.server_seed_hash,
    serverSeed: result.server_seed,
    refId: roundRef,
    betId: result.bet_id || result.id || null,
    idempotent: Boolean(result.idempotent),
    rollover: result.effects?.rollover ?? null,
  });
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(req);
    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const paused = await assertGamesNotPaused();
    if (paused) return paused;

    const exclusion = await getSelfExclusionState(
      supabaseAdmin as any,
      session.user.id
    );
    if (!exclusion.ok) {
      console.error("Crash self-exclusion lookup failed", exclusion.error);
      return NextResponse.json(
        { ok: false, error: "RESPONSIBLE_GAMING_CHECK_FAILED" },
        { status: 503 }
      );
    }
    if (exclusion.excluded) {
      return NextResponse.json(
        {
          ok: false,
          error: "SELF_EXCLUDED",
          until: exclusion.until,
        },
        { status: 403 }
      );
    }

    const body = await req
      .json()
      .catch(() => ({} as Record<string, unknown>));
    const betAmount = roundMoney(Number(body?.betAmount ?? body?.bet ?? 0));
    const targetMultiplier = Number(
      body?.targetMultiplier ?? body?.cashoutAt ?? body?.multiplier ?? 0
    );

    if (!Number.isFinite(betAmount) || betAmount <= 0) {
      return NextResponse.json(
        { ok: false, error: "INVALID_BET" },
        { status: 400 }
      );
    }
    if (
      !Number.isFinite(targetMultiplier) ||
      targetMultiplier < 1.01 ||
      targetMultiplier > 1000
    ) {
      return NextResponse.json(
        { ok: false, error: "INVALID_AUTO_CASHOUT" },
        { status: 400 }
      );
    }

    const key = requestKey(
      req.headers.get("idempotency-key") || body?.requestId
    );
    if (!key) {
      return NextResponse.json(
        { ok: false, error: "IDEMPOTENCY_KEY_REQUIRED" },
        { status: 400 }
      );
    }

    const refId = `cr_${session.user.id}_${key}`;
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("crash_bets")
      .select(
        "id,ref_id,bet_amount,target_multiplier,crash_multiplier,did_cashout,payout,server_seed_hash,server_seed,metadata"
      )
      .eq("ref_id", refId)
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (existingError) {
      console.error("Existing Crash lookup failed", existingError);
      return NextResponse.json(
        { ok: false, error: "IDEMPOTENCY_LOOKUP_FAILED" },
        { status: 500 }
      );
    }
    if (existing) {
      return crashResponse({ ...existing, idempotent: true });
    }

    const promoState = await getPromoLimitState(
      supabaseAdmin as any,
      session.user.id
    );
    if (!promoState.ok) {
      console.error("Crash promo limit lookup failed", promoState.error);
      return NextResponse.json(
        { ok: false, error: "PROMO_LIMIT_CHECK_FAILED" },
        { status: 503 }
      );
    }
    if (promoState.hasRollover && betAmount > promoState.maxBet) {
      return NextResponse.json(
        {
          ok: false,
          error: "PROMO_MAX_BET",
          message: `Con bono activo, la apuesta maxima es ${promoState.maxBet} MXN.`,
          maxBet: promoState.maxBet,
          required: promoState.required,
          progress: promoState.progress,
        },
        { status: 400 }
      );
    }

    const edgeBpsRaw = Number(process.env.CRASH_HOUSE_EDGE_BPS ?? 200);
    const edgeBps = clamp(
      Number.isFinite(edgeBpsRaw) ? edgeBpsRaw : 200,
      0,
      5000
    );
    const houseFactor = 1 - edgeBps / 10000;

    const serverSeed = generateServerSeed();
    const seedHash = serverSeedHash(serverSeed);
    const random = clamp(
      fairFloat(serverSeed, `client:${refId}`, 0),
      0,
      0.999999999
    );
    let crashMultiplier =
      Math.floor((houseFactor / (1 - random)) * 100) / 100;
    if (!Number.isFinite(crashMultiplier) || crashMultiplier < 1) {
      crashMultiplier = 1;
    }
    crashMultiplier = Math.min(crashMultiplier, 1_000_000);

    const didCashout = targetMultiplier <= crashMultiplier;
    const payout = didCashout
      ? roundMoney(betAmount * targetMultiplier)
      : 0;

    const { data: settlement, error: settlementError } =
      await supabaseAdmin.rpc("casino_settle_crash", {
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
      console.error("Crash atomic settlement failed", settlementError);
      return settlementFailure(settlementError.message || "");
    }

    return crashResponse((settlement || {}) as PersistedCrash);
  } catch (error) {
    console.error("Crash play error", error);
    return NextResponse.json(
      { ok: false, error: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
