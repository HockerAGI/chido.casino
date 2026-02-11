export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { walletApplyDelta } from "@/lib/walletApplyDelta";
import { fairFloat, generateServerSeed, serverSeedHash } from "@/lib/provablyFair";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function crashFromFloat(r: number) {
  // House edge suave (1%)
  const houseEdge = 0.01;
  const x = (1 - houseEdge) / (1 - r); // r in [0,1)
  const crash = Math.floor(x * 100) / 100; // 2 decimales
  return clamp(crash, 1.0, 1000.0);
}

function isInsufficient(msg: string) {
  const m = msg.toLowerCase();
  return m.includes("insufficient") || m.includes("saldo") || m.includes("balance");
}

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json();
    const betAmount = Number(body?.betAmount);
    const targetMultiplier = Number(body?.targetMultiplier);

    if (!Number.isFinite(betAmount) || betAmount <= 0) {
      return NextResponse.json({ error: "Apuesta inválida" }, { status: 400 });
    }
    if (!Number.isFinite(targetMultiplier) || targetMultiplier < 1.01 || targetMultiplier > 100) {
      return NextResponse.json({ error: "Multiplicador inválido" }, { status: 400 });
    }

    // Nonce global secuencial (para verificación reproducible)
    const { data: maxRound } = await supabaseAdmin
      .from("crash_rounds")
      .select("nonce")
      .order("nonce", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nonce = Number(maxRound?.nonce ?? -1) + 1;

    // 1) Debitar apuesta
    const refId = `cr_${session.user.id}_${Date.now()}`;
    const deb = await walletApplyDelta(supabaseAdmin, {
      userId: session.user.id,
      deltaBalance: -betAmount,
      deltaBonus: 0,
      deltaLocked: 0,
      reason: "crash_bet",
      refId,
      metadata: { game: "crash", targetMultiplier },
    });

    if (deb.error) {
      const msg = String(deb.error?.message || "");
      if (isInsufficient(msg)) return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });
      return NextResponse.json({ error: "WALLET_ERROR" }, { status: 500 });
    }

    // 2) Provably fair
    const serverSeed = generateServerSeed(32);
    const serverSeedHashHex = serverSeedHash(serverSeed);
    const clientSeed = String(body?.clientSeed || session.user.id);

    const r = fairFloat(serverSeed, clientSeed, nonce, 0);
    const crashPoint = Number(crashFromFloat(r).toFixed(2));

    // 3) Guardar round
    const roundIns = await supabaseAdmin
      .from("crash_rounds")
      .insert({
        crash_point: crashPoint,
        server_seed_hash: serverSeedHashHex,
        nonce,
      })
      .select("id")
      .single();

    if (roundIns.error) {
      // rollback best-effort (regresa la apuesta)
      await walletApplyDelta(supabaseAdmin, {
        userId: session.user.id,
        deltaBalance: +betAmount,
        deltaBonus: 0,
        deltaLocked: 0,
        reason: "crash_rollback",
        refId: `${refId}:rb`,
        metadata: { why: "round_insert_failed" },
      });

      return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
    }

    const roundId = roundIns.data.id as string;

    const win = crashPoint >= targetMultiplier;
    const payout = win ? Number((betAmount * targetMultiplier).toFixed(2)) : 0;

    // 4) Guardar bet
    const betIns = await supabaseAdmin.from("crash_bets").insert({
      user_id: session.user.id,
      round_id: roundId,
      bet_amount: betAmount,
      cashout_multiplier: targetMultiplier,
      payout_amount: payout,
    });

    if (betIns.error) {
      console.error("crash_bets insert error:", betIns.error);
      // no tumbamos (pero ya quedó round)
    }

    // 5) Si gana, acreditar payout (stake+profit)
    if (win && payout > 0) {
      const credit = await walletApplyDelta(supabaseAdmin, {
        userId: session.user.id,
        deltaBalance: +payout,
        deltaBonus: 0,
        deltaLocked: 0,
        reason: "crash_payout",
        refId: `${refId}:payout`,
        metadata: { game: "crash", crashPoint, targetMultiplier },
      });

      if (credit.error) {
        // si falla payout, devolvemos apuesta (mejor perder edge que romper confianza)
        await walletApplyDelta(supabaseAdmin, {
          userId: session.user.id,
          deltaBalance: +betAmount,
          deltaBonus: 0,
          deltaLocked: 0,
          reason: "crash_payout_failed_refund",
          refId: `${refId}:refund`,
          metadata: { why: "payout_failed" },
        });

        return NextResponse.json({ error: "PAYOUT_ERROR" }, { status: 500 });
      }
    }

    return NextResponse.json({
      crashPoint,
      win,
      payout,
      fair: {
        serverSeedHash: serverSeedHashHex,
        serverSeed, // reveal inmediato (verificable con hash)
        clientSeed,
        nonce,
      },
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Error interno" }, { status: 500 });
  }
}