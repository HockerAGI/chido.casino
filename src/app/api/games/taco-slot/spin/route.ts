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

type SymbolKey = "verde" | "jalapeno" | "serrano" | "habanero";
type Reel = { key: SymbolKey; img: string };

type PersistedSpin = {
  id?: string | null;
  spin_id?: string | null;
  round_ref?: string | null;
  bet_amount?: number | string | null;
  payout_amount?: number | string | null;
  multiplier?: number | string | null;
  reels?: Reel[] | null;
  server_seed_hash?: string | null;
  server_seed?: string | null;
  client_seed?: string | null;
  nonce?: number | string | null;
  metadata?: Record<string, unknown> | null;
  effects?: Record<string, unknown> | null;
  idempotent?: boolean;
};

const SYMBOLS: { key: SymbolKey; img: string; weight: number }[] = [
  { key: "verde", img: "/badge-verde.png", weight: 42 },
  { key: "jalapeno", img: "/badge-jalapeno.png", weight: 30 },
  { key: "serrano", img: "/badge-serrano.png", weight: 20 },
  { key: "habanero", img: "/badge-habanero.png", weight: 8 },
];
const PAIR_MULTIPLIER = 0.82;
const EXPECTED_RTP = 0.947376;

function pickWeighted(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  round: number
) {
  const total = SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);
  const random = fairFloat(serverSeed, clientSeed, nonce, round) * total;
  let accumulated = 0;
  for (const symbol of SYMBOLS) {
    accumulated += symbol.weight;
    if (random <= accumulated) return { key: symbol.key, img: symbol.img };
  }
  return { key: SYMBOLS[0].key, img: SYMBOLS[0].img };
}

function calcMultiplier(reels: { key: SymbolKey }[]) {
  const [first, second, third] = reels.map((item) => item.key);
  if (first === second && second === third) {
    if (first === "habanero") return 20;
    if (first === "serrano") return 10;
    if (first === "jalapeno") return 5;
    return 3;
  }
  return first === second || second === third || first === third
    ? PAIR_MULTIPLIER
    : 0;
}

function levelFromBet(bet: number) {
  if (bet <= 20) {
    return {
      key: "verde" as const,
      label: "Nivel Verde",
      badge: "/badge-verde.png",
    };
  }
  if (bet <= 50) {
    return {
      key: "jalapeno" as const,
      label: "Nivel Jalapeno",
      badge: "/badge-jalapeno.png",
    };
  }
  if (bet <= 120) {
    return {
      key: "serrano" as const,
      label: "Nivel Serrano",
      badge: "/badge-serrano.png",
    };
  }
  return {
    key: "habanero" as const,
    label: "Nivel Habanero",
    badge: "/badge-habanero.png",
  };
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

function spinResponse(result: PersistedSpin) {
  const bet = roundMoney(Number(result.bet_amount));
  const payout = roundMoney(Number(result.payout_amount));
  const multiplier = Number(result.multiplier);
  const nonce = Number(result.nonce);
  const reels = Array.isArray(result.reels) ? result.reels : [];
  const metadata = result.metadata || {};
  const rtp = Number(metadata.expected_rtp ?? EXPECTED_RTP);

  if (
    !result.round_ref ||
    !Number.isFinite(bet) ||
    bet <= 0 ||
    !Number.isFinite(payout) ||
    payout < 0 ||
    !Number.isFinite(multiplier) ||
    multiplier < 0 ||
    !Number.isSafeInteger(nonce) ||
    nonce <= 0 ||
    reels.length !== 3 ||
    !result.server_seed_hash ||
    !result.server_seed ||
    !result.client_seed
  ) {
    return NextResponse.json(
      { ok: false, error: "PERSISTED_SPIN_INVALID" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    spinId: result.round_ref,
    dbSpinId: result.spin_id || result.id || null,
    bet,
    payout,
    multiplier,
    reels,
    level: levelFromBet(bet),
    rtp: Number.isFinite(rtp) ? rtp : EXPECTED_RTP,
    idempotent: Boolean(result.idempotent),
    rollover: result.effects?.rollover ?? null,
    fair: {
      serverSeedHash: result.server_seed_hash,
      serverSeed: result.server_seed,
      clientSeed: result.client_seed,
      nonce,
    },
    message: payout > 0 ? `Ganaste x${multiplier}` : "Sin premio en este giro.",
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
      console.error("Taco self-exclusion lookup failed", exclusion.error);
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
    const bet = roundMoney(Number(body?.bet));
    if (!Number.isFinite(bet) || bet <= 0) {
      return NextResponse.json(
        { ok: false, error: "INVALID_BET" },
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

    const roundRef = `ts_${session.user.id}_${key}`;
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("slot_spins")
      .select(
        "id,round_ref,bet_amount,payout_amount,multiplier,reels,server_seed_hash,server_seed,client_seed,nonce,metadata"
      )
      .eq("round_ref", roundRef)
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (existingError) {
      console.error("Existing Taco spin lookup failed", existingError);
      return NextResponse.json(
        { ok: false, error: "IDEMPOTENCY_LOOKUP_FAILED" },
        { status: 500 }
      );
    }
    if (existing) {
      return spinResponse({ ...existing, idempotent: true });
    }

    const promoState = await getPromoLimitState(
      supabaseAdmin as any,
      session.user.id
    );
    if (!promoState.ok) {
      console.error("Taco promo limit lookup failed", promoState.error);
      return NextResponse.json(
        { ok: false, error: "PROMO_LIMIT_CHECK_FAILED" },
        { status: 503 }
      );
    }
    if (promoState.hasRollover && bet > promoState.maxBet) {
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

    const { data: nonceData, error: nonceError } = await supabaseAdmin.rpc(
      "next_slot_nonce"
    );
    if (nonceError) {
      console.error("Slot nonce generation failed", nonceError);
      return NextResponse.json(
        { ok: false, error: "NONCE_FAILED" },
        { status: 500 }
      );
    }
    const nonce = Number(nonceData);
    if (!Number.isSafeInteger(nonce) || nonce <= 0) {
      return NextResponse.json(
        { ok: false, error: "NONCE_INVALID" },
        { status: 500 }
      );
    }

    const serverSeed = generateServerSeed(32);
    const serverSeedHashHex = serverSeedHash(serverSeed);
    const clientSeed = String(body?.clientSeed || session.user.id);
    const reels = [0, 1, 2].map((round) =>
      pickWeighted(serverSeed, clientSeed, nonce, round)
    );
    const multiplier = calcMultiplier(reels);
    const payout = multiplier > 0 ? roundMoney(bet * multiplier) : 0;

    const { data: settlement, error: settlementError } =
      await supabaseAdmin.rpc("casino_settle_taco_slot", {
        p_user_id: session.user.id,
        p_round_ref: roundRef,
        p_bet_amount: bet,
        p_payout_amount: payout,
        p_multiplier: multiplier,
        p_reels: reels,
        p_server_seed_hash: serverSeedHashHex,
        p_server_seed: serverSeed,
        p_client_seed: clientSeed,
        p_nonce: nonce,
        p_metadata: {
          pair_multiplier: PAIR_MULTIPLIER,
          expected_rtp: EXPECTED_RTP,
        },
      });

    if (settlementError) {
      console.error("Slot atomic settlement failed", settlementError);
      return settlementFailure(settlementError.message || "");
    }

    return spinResponse((settlement || {}) as PersistedSpin);
  } catch (error) {
    console.error("Taco slot error", error);
    return NextResponse.json(
      { ok: false, error: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
