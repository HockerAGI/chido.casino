import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/getServerSession";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logFraudEvent } from "@/lib/fraudLogger";
import { guardPromoMaxBet } from "@/lib/promoMaxBet";
import { enforceResponsibleGate } from "@/lib/responsibleGate";

type SymbolKey = "verde" | "jalapeno" | "serrano" | "habanero";

const SYMBOLS: Array<{ key: SymbolKey; img: string; weight: number; payoutMult: number }> = [
  { key: "verde", img: "/slot-verde.png", weight: 52, payoutMult: 3 },
  { key: "jalapeno", img: "/slot-jalapeno.png", weight: 28, payoutMult: 5 },
  { key: "serrano", img: "/slot-serrano.png", weight: 15, payoutMult: 10 },
  { key: "habanero", img: "/slot-habanero.png", weight: 5, payoutMult: 20 },
];

function pickSymbol(): (typeof SYMBOLS)[number] {
  const total = SYMBOLS.reduce((a, b) => a + b.weight, 0);
  let r = Math.random() * total;
  for (const s of SYMBOLS) {
    r -= s.weight;
    if (r <= 0) return s;
  }
  return SYMBOLS[0];
}

function computeLevel(bet: number) {
  if (bet >= 500) return { key: "habanero", label: "Habanero", badge: "/badge-habanero.png" };
  if (bet >= 200) return { key: "serrano", label: "Serrano", badge: "/badge-serrano.png" };
  if (bet >= 50) return { key: "jalapeno", label: "Jalapeño", badge: "/badge-jalapeno.png" };
  return { key: "verde", label: "Verde", badge: "/badge-verde.png" };
}

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const userId = session.user.id;

  const body = await req.json().catch(() => ({}));
  const bet = Number(body?.bet || 0);

  if (!Number.isFinite(bet) || bet <= 0) {
    return NextResponse.json({ ok: false, error: "INVALID_BET" }, { status: 400 });
  }

  // Responsible gate (autoexclusión, etc.)
  const gate = await enforceResponsibleGate(userId);
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: gate.error, message: gate.message }, { status: 403 });
  }

  // Promo cap gate (si hay rollover)
  const cap = await guardPromoMaxBet(userId, bet);
  if (!cap.ok) {
    return NextResponse.json(
      { ok: false, error: cap.error, message: cap.message, maxBet: cap.maxBet },
      { status: 400 }
    );
  }

  // Simulación reels
  const r1 = pickSymbol();
  const r2 = pickSymbol();
  const r3 = pickSymbol();
  const reels = [r1, r2, r3];

  const same3 = r1.key === r2.key && r2.key === r3.key;

  const multiplier = same3 ? r1.payoutMult : 0;
  const payout = multiplier > 0 ? bet * multiplier : 0;

  const spinId = crypto.randomUUID();
  const level = computeLevel(bet);

  // Anti-abuse / fraud log (simple)
  await logFraudEvent({
    user_id: userId,
    event_type: "slot_spin",
    severity: same3 && multiplier >= 10 ? "medium" : "low",
    details: { bet, payout, multiplier, reels: reels.map((x) => x.key), spinId },
  });

  // Ledger: aplica delta (bet sale, payout entra)
  // Nota: tu RPC wallet_apply_delta ya quedó en DB.
  const delta = payout - bet;

  const { error: rpcErr } = await supabaseAdmin.rpc("wallet_apply_delta", {
    p_user_id: userId,
    p_delta_cash: delta,
    p_delta_bonus: 0,
    p_lock_bonus: 0,
    p_ref_type: "slot",
    p_ref_id: spinId,
    p_note: "Taco Slot spin",
  });

  if (rpcErr) {
    return NextResponse.json({ ok: false, error: "LEDGER_FAILED", message: rpcErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    spinId,
    bet,
    payout,
    multiplier,
    reels: reels.map((x) => ({ key: x.key, img: x.img })),
    level,
    fair: {
      // aquí tu backend puede meter seeds reales si ya los manejas
      serverSeedHash: null,
      nonce: null,
    },
  });
}