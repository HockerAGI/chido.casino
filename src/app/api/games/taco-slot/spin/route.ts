export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { walletApplyDelta } from "@/lib/walletApplyDelta";
import { fairFloat, generateServerSeed, serverSeedHash } from "@/lib/provablyFair";

type SymbolKey = "verde" | "jalapeno" | "serrano" | "habanero";

const SYMBOLS: { key: SymbolKey; img: string; weight: number }[] = [
  { key: "verde", img: "/badge-verde.png", weight: 42 },
  { key: "jalapeno", img: "/badge-jalapeno.png", weight: 30 },
  { key: "serrano", img: "/badge-serrano.png", weight: 20 },
  { key: "habanero", img: "/badge-habanero.png", weight: 8 },
];

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

  if (a === b || b === c || a === c) return 1.5;

  return 0;
}

function levelFromBet(bet: number) {
  if (bet <= 20) return { key: "verde" as const, label: "Nivel Verde", badge: "/badge-verde.png" };
  if (bet <= 50)
    return { key: "jalapeno" as const, label: "Nivel Jalapeño", badge: "/badge-jalapeno.png" };
  if (bet <= 120)
    return { key: "serrano" as const, label: "Nivel Serrano", badge: "/badge-serrano.png" };
  return { key: "habanero" as const, label: "Nivel Habanero", badge: "/badge-habanero.png" };
}

function isInsufficient(msg: string) {
  const m = msg.toLowerCase();
  return m.includes("insufficient") || m.includes("saldo") || m.includes("balance");
}

function isMissingTable(msg: string) {
  const m = msg.toLowerCase();
  return m.includes("relation") && m.includes("does not exist");
}

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const bet = Number(body?.bet);
    if (!Number.isFinite(bet) || bet <= 0) {
      return NextResponse.json({ ok: false, error: "Apuesta inválida" }, { status: 400 });
    }

    // Nonce global secuencial (best-effort)
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

    // 1) Debitar apuesta
    const deb = await walletApplyDelta(supabaseAdmin, {
      userId: session.user.id,
      deltaBalance: -bet,
      deltaBonus: 0,
      deltaLocked: 0,
      reason: "taco_slot_bet",
      refId: `${spinId}:bet`,
      metadata: { game: "taco_slot" },
    });

    if (deb.error) {
      // FIX: deb.error es string directo
      const msg = String(deb.error || "");
      if (isInsufficient(msg)) return NextResponse.json({ ok: false, error: "Saldo insuficiente" }, { status: 400 });
      console.error("wallet_apply_delta bet error:", deb.error);
      return NextResponse.json({ ok: false, error: "WALLET_ERROR" }, { status: 500 });
    }

    // 2) Provably-fair (commit/reveal en la misma respuesta)
    const serverSeed = generateServerSeed(32);
    const serverSeedHashHex = serverSeedHash(serverSeed);
    const clientSeed = String(body?.clientSeed || session.user.id);

    // 3) Reels
    const reels = [0, 1, 2].map((i) => pickWeighted(serverSeed, clientSeed, Number(nonce), i));

    // 4) Payout
    const multiplier = calcMultiplier(reels);
    const payout = multiplier > 0 ? Number((bet * multiplier).toFixed(2)) : 0;

    if (payout > 0) {
      const credit = await walletApplyDelta(supabaseAdmin, {
        userId: session.user.id,
        deltaBalance: +payout,
        deltaBonus: 0,
        deltaLocked: 0,
        reason: "taco_slot_payout",
        refId: `${spinId}:payout`,
        metadata: { game: "taco_slot", reels, multiplier, bet },
      });

      if (credit.error) {
        // Best-effort rollback: devuelve apuesta
        await walletApplyDelta(supabaseAdmin, {
          userId: session.user.id,
          deltaBalance: +bet,
          deltaBonus: 0,
          deltaLocked: 0,
          reason: "taco_slot_rollback",
          refId: `${spinId}:rb`,
          metadata: { why: "payout_failed" },
        });

        console.error("wallet_apply_delta payout error:", credit.error);
        return NextResponse.json({ ok: false, error: "PAYOUT_ERROR" }, { status: 500 });
      }
    }

    // 5) Log en DB (si existe tabla)
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
    });

    if (ins.error && !isMissingTable(String((ins.error as any)?.message || ""))) {
      console.error("slot_spins insert error:", ins.error);
    }

    return NextResponse.json({
      ok: true,
      spinId,
      bet,
      payout,
      multiplier,
      reels,
      level: levelFromBet(bet),
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