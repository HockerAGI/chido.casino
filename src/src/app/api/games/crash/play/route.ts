import { NextResponse } from "next/server";
import crypto from "crypto";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function computeCrashPoint(serverSeed: string, clientSeed: string, nonce: number) {
  // HMAC para que sea determinista y verificable
  const h = crypto
    .createHmac("sha256", serverSeed)
    .update(`${clientSeed}:${nonce}`)
    .digest("hex");

  const hInt = parseInt(h.slice(0, 13), 16);
  const e = Math.pow(2, 52);
  const point = Math.floor((100 * e - hInt) / (e - hInt)) / 100;
  return Math.max(1.0, point);
}

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const amount = Number(body?.amount);
    const target = Number(body?.target);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
    }
    if (!Number.isFinite(target) || target < 1.01) {
      return NextResponse.json({ error: "Target inválido (min 1.01)" }, { status: 400 });
    }

    const nonce = Date.now();
    const serverSeed = crypto.randomBytes(32).toString("hex");
    const serverSeedHash = crypto.createHash("sha256").update(serverSeed).digest("hex");
    const clientSeed = session.user.id;

    const crashPoint = computeCrashPoint(serverSeed, clientSeed, nonce);

    const { data, error } = await supabaseAdmin.rpc("crash_play_round", {
      p_user_id: session.user.id,
      p_bet_amount: amount,
      p_auto_cashout: target,
      p_nonce: nonce,
      p_server_seed: serverSeed,
      p_server_seed_hash: serverSeedHash,
      p_client_seed: clientSeed,
      p_crash_point: crashPoint,
    });

    if (error) {
      const msg = String(error.message || "");
      if (msg.includes("INSUFFICIENT_BALANCE")) {
        return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });
      }
      if (msg.includes("INVALID_")) {
        return NextResponse.json({ error: msg }, { status: 400 });
      }
      console.error(error);
      return NextResponse.json({ error: "CRASH_ENGINE_ERROR" }, { status: 500 });
    }

    const row = Array.isArray(data) ? data[0] : data;

    return NextResponse.json({
      ok: true,
      crashPoint,
      win: Boolean(row?.win),
      payout: Number(row?.payout ?? 0),
      roundId: row?.round_id,
      betId: row?.bet_id,
      serverSeedHash,
      nonce,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Error interno" }, { status: 500 });
  }
}