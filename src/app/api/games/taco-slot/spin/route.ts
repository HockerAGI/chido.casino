export const runtime = "nodejs";

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fairFloat, generateServerSeed, serverSeedHash } from "@/lib/provablyFair";
import { promoWageringProgress } from "@/lib/promoWagering";
import { getPromoLimitState } from "@/lib/promoLimits";
import { assertGamesNotPaused } from "@/lib/gamesPaused";

type SymbolKey = "verde" | "jalapeno" | "serrano" | "habanero";

const SYMBOLS: { key: SymbolKey; img: string; weight: number }[] = [
  { key: "verde", img: "/badge-verde.png", weight: 42 },
  { key: "jalapeno", img: "/badge-jalapeno.png", weight: 30 },
  { key: "serrano", img: "/badge-serrano.png", weight: 20 },
  { key: "habanero", img: "/badge-habanero.png", weight: 8 },
];

const PAIR_MULTIPLIER = 0.82;

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
    if (random <= accumulated) {
      return { key: symbol.key, img: symbol.img };
    }
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

  if (first === second || second === third || first === third) {
    return PAIR_MULTIPLIER;
  }

  return 0;
}

function levelFromBet(bet: number) {
  if (bet <= 20) {
    return { key: "verde" as const, label: "Nivel Verde", badge: "/badge-verde.png" };
  }
  if (bet <= 50) {
    return {
      key: "jalapeno" as const,
      label: "Nivel Jalapeño",
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

function safeRequestKey(value: unknown) {
  const candidate = String(value || "").trim();
  return /^[a-zA-Z0-9:_-]{8,128}$/.test(candidate)
    ? candidate
    : randomUUID();
}

function isInsufficientFunds(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("insufficient") ||
    normalized.includes("saldo") ||
    normalized.includes("funds")
  );
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    const paused = await assertGamesNotPaused();
    if (paused) return paused;

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const bet = roundMoney(Number(body?.bet));

    if (!Number.isFinite(bet) || bet <= 0) {
      return NextResponse.json(
        { ok: false, error: "Apuesta inválida" },
        { status: 400 }
      );
    }

    const promoState = await getPromoLimitState(
      supabaseAdmin as any,
      session.user.id
    );
    if (promoState.ok && promoState.hasRollover && bet > promoState.maxBet) {
      return NextResponse.json(
        {
          ok: false,
          error: "PROMO_MAX_BET",
          message: `Con bono activo (rollover), la apuesta máxima por jugada es ${promoState.maxBet} MXN.`,
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
      throw new Error(`NONCE_ERROR: ${nonceError.message}`);
    }

    const nonce = Number(nonceData);
    if (!Number.isSafeInteger(nonce) || nonce <= 0) {
      throw new Error("NONCE_INVALID");
    }

    const requestKey = safeRequestKey(
      req.headers.get("idempotency-key") || body?.requestId
    );
    const spinId = `ts_${session.user.id}_${requestKey}`;
    const serverSeed = generateServerSeed(32);
    const serverSeedHashHex = serverSeedHash(serverSeed);
    const clientSeed = String(body?.clientSeed || session.user.id);
    const reels = [0, 1, 2].map((round) =>
      pickWeighted(serverSeed, clientSeed, nonce, round)
    );
    const multiplier = calcMultiplier(reels);
    const payout = multiplier > 0 ? roundMoney(bet * multiplier) : 0;

    const { data: settlement, error: settlementError } = await supabaseAdmin.rpc(
      "casino_settle_taco_slot",
      {
        p_user_id: session.user.id,
        p_round_ref: spinId,
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
          expected_rtp: 0.947376,
        },
      }
    );

    if (settlementError) {
      if (isInsufficientFunds(settlementError.message)) {
        return NextResponse.json(
          { ok: false, error: "Saldo insuficiente" },
          { status: 400 }
        );
      }
      throw new Error(`SETTLEMENT_ERROR: ${settlementError.message}`);
    }

    const wagering = await promoWageringProgress(supabaseAdmin as any, {
      userId: session.user.id,
      wagerAmount: bet,
      wagerRef: `slot:${spinId}`,
      game: "taco_slot",
    });
    if (!wagering.ok) {
      console.error("Taco slot wagering progress error:", wagering.error);
    }

    return NextResponse.json({
      ok: true,
      spinId,
      bet,
      payout,
      multiplier,
      reels,
      level: levelFromBet(bet),
      rtp: 0.947376,
      idempotent: Boolean((settlement as any)?.idempotent),
      fair: {
        serverSeedHash: serverSeedHashHex,
        serverSeed,
        clientSeed,
        nonce,
      },
      message: payout > 0 ? `Ganaste x${multiplier} 🔥` : "No pegó… otra 🔁",
    });
  } catch (error) {
    console.error("Taco slot error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Error interno",
      },
      { status: 500 }
    );
  }
}
