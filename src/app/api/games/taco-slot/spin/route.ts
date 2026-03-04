export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { walletApplyDelta } from "@/lib/walletApplyDelta";
import { fairFloat, generateServerSeed, serverSeedHash } from "@/lib/provablyFair";
import { promoWageringProgress } from "@/lib/promoWagering";

type SymbolKey = "verde" | "jalapeno" | "serrano" | "habanero";

const SYMBOLS: { key: SymbolKey; img: string; weight: number }[] = [
  { key: "verde", img: "/badge-verde.png", weight: 42 },
  { key: "jalapeno", img: "/badge-jalapeno.png", weight: 30 },
  { key: "serrano", img: "/badge-serrano.png", weight: 20 },
  { key: "habanero", img: "/badge-habanero.png", weight: 8 },
];

// Par ajustado: RTP esperado ≈ 94.7376%
const PAIR_MULTIPLIER = 0.82;

function pickWeighted(serverSeed: string, clientSeed: string, nonce: number, round: number) {
  const total = SYMBOLS.reduce((s, x) => s + x.weight, 0);
  const r = fairFloat(serverSeed, clientSeed, nonce, round) * total;

  let acc = 0;
  for (const s of SYMBOLS) {
    acc += s.weight;
    if (r <= acc) return { key: s.key, img: s.img };
  }
  return { key: SYMBOLS[0].key, img: SYMBOLS[0].img };
}

function calcMultiplier(reels: { key: SymbolKey }[]) {
  const [a, b, c] = reels.map((x) => x.key);

  if (a === b && b === c) {
    if (a === "habanero") return 20;
    if (a === "serrano") return 10;
    if (a === "jalapeno") return 5;
    return 3;
  }

  if (a === b || b === c || a === c) return PAIR_MULTIPLIER;
  return 0;
}

function levelFromBet(bet: number) {
  if (bet <= 20) return { key: "verde" as const, label: "Nivel Verde", badge: "/badge-verde.png" };
  if (bet <= 50) return { key: "jalapeno" as const, label: "Nivel Jalapeño", badge: "/badge-jalapeno.png" };
  if (bet <= 120) return { key: "serrano" as const, label: "Nivel Serrano", badge: "/badge-serrano.png" };
  return { key: "habanero" as const, label: "Nivel Habanero", badge: "/badge-habanero.png" };
}

function isInsufficient(msg: string) {
  const m = (msg || "").toLowerCase();
  return m.includes("insufficient") || m.includes("saldo") || m.includes("balance") || m.includes("not enough");
}
function isMissingTable(msg: string) {
  const m = (msg || "").toLowerCase();
  return m.includes("relation") && m.includes("does not exist");
}
function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

async function spendBet(userId: string, bet: number, refId: string) {
  // balance primero
  const a = await walletApplyDelta(supabaseAdmin as any, {
    userId,
    deltaBalance: -bet,
    deltaBonus: 0,
    deltaLocked: 0,
    reason: "taco_slot_bet_balance",
    refId,
  });
  if (!a.error) return { source: "balance" as const };

  if (!isInsufficient(String(a.error || ""))) return { source: "error" as const, error: "WALLET_ERROR" };

  // bonus después
  const b = await walletApplyDelta(supabaseAdmin as any, {
    userId,
    deltaBalance: 0,
    deltaBonus: -bet,
    deltaLocked: 0,
    reason: "taco_slot_bet_bonus",
    refId,
  });
  if (!b.error) return { source: "bonus" as const };

  if (isInsufficient(String(b.error || ""))) return { source: "error" as const, error: "Saldo insuficiente" };
  return { source: "error" as const, error: "WALLET_ERROR" };
}

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });

    const body = await req.json().catch(() => ({} as any));
    const bet = Number(body?.bet);

    if (!Number.isFinite(bet) || bet <= 0) {
      return NextResponse.json({ ok: false, error: "Apuesta inválida" }, { status: 400 });
    }

    // nonce global best-effort
    const { data: maxRow, error: maxErr } = await supabaseAdmin
      .from("slot_spins")
      .select("nonce")
      .order("nonce", { ascending: false })
      .limit(1)
      .maybeSingle();

    let nonce = 0;
    if (!maxErr && maxRow?.nonce != null) nonce = Number(maxRow.nonce) + 1;
    if (maxErr && isMissingTable(String((maxErr as any)?.message || ""))) nonce = Date.now();

    const spinId = `ts_${session.user.id}_${Date.now()}`;

    // debitar bet (balance o bonus)
    const spent = await spendBet(session.user.id, bet, `${spinId}:bet`);
    if (spent.source === "error") {
      return NextResponse.json({ ok: false, error: spent.error }, { status: 400 });
    }

    // provably fair
    const serverSeed = generateServerSeed(32);
    const serverSeedHashHex = serverSeedHash(serverSeed);
    const clientSeed = String(body?.clientSeed || session.user.id);

    const reels = [0, 1, 2].map((i) => pickWeighted(serverSeed, clientSeed, Number(nonce), i));

    const multiplier = calcMultiplier(reels);
    const payout = multiplier > 0 ? round2(bet * multiplier) : 0;

    // payout SIEMPRE a balance real (y si hay promo, retiro queda bloqueado hasta completar)
    if (payout > 0) {
      const credit = await walletApplyDelta(supabaseAdmin as any, {
        userId: session.user.id,
        deltaBalance: +payout,
        deltaBonus: 0,
        deltaLocked: 0,
        reason: "taco_slot_payout",
        refId: `${spinId}:payout`,
      });

      if (credit.error) {
        // rollback best-effort: devuelve bet al mismo bucket
        await walletApplyDelta(supabaseAdmin as any, {
          userId: session.user.id,
          deltaBalance: spent.source === "balance" ? +bet : 0,
          deltaBonus: spent.source === "bonus" ? +bet : 0,
          deltaLocked: 0,
          reason: "taco_slot_rollback",
          refId: `${spinId}:rb`,
        });
        return NextResponse.json({ ok: false, error: "PAYOUT_ERROR" }, { status: 500 });
      }
    }

    // log spin (si existe tabla)
    const ins = await supabaseAdmin.from("slot_spins").insert({
      user_id: session.user.id,
      bet_amount: bet,
      payout_amount: payout,
      multiplier,
      reels,
      server_seed_hash: serverSeedHashHex,
      server_seed: serverSeed,
      client_seed: clientSeed,
      nonce: Number(nonce),
      metadata: { pair_multiplier: PAIR_MULTIPLIER, expected_rtp: 0.947376 },
    });

    if (ins.error && !isMissingTable(String((ins.error as any)?.message || ""))) {
      // no rompemos UX por logging
      console.error("slot_spins insert error:", ins.error);
    }

    // Avanza rollover promo
    await promoWageringProgress(supabaseAdmin as any, {
      userId: session.user.id,
      wagerAmount: bet,
      wagerRef: `slot:${spinId}`,
      game: "taco_slot",
    });

    return NextResponse.json({
      ok: true,
      spinId,
      bet,
      payout,
      multiplier,
      reels,
      level: levelFromBet(bet),
      rtp: 0.947376,
      fair: {
        serverSeedHash: serverSeedHashHex,
        serverSeed,
        clientSeed,
        nonce: Number(nonce),
      },
      message: payout > 0 ? `Ganaste x${multiplier} 🔥` : "No pegó… otra 🔁",
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e?.message || "Error interno" }, { status: 500 });
  }
}