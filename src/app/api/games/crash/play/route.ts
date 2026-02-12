import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSession } from "@/lib/session";
import { walletApplyDelta } from "@/lib/walletApplyDelta";

function isInsufficient(msg: string) {
  const m = msg.toLowerCase();
  return (
    m.includes("insufficient") ||
    m.includes("saldo") ||
    m.includes("balance") ||
    m.includes("locked")
  );
}

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session?.user?.id)
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const betAmount = Number(body?.betAmount ?? 0);
  const cashoutAt = Number(body?.cashoutAt ?? 0);

  if (!Number.isFinite(betAmount) || betAmount <= 0) {
    return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
  }
  if (!Number.isFinite(cashoutAt) || cashoutAt < 1.01) {
    return NextResponse.json({ error: "Cashout inválido" }, { status: 400 });
  }

  // 0) Reglas rápidas
  if (betAmount < 1)
    return NextResponse.json({ error: "Mínimo $1" }, { status: 400 });
  if (betAmount > 5000)
    return NextResponse.json({ error: "Máximo $5000" }, { status: 400 });

  // 1) Debitar apuesta (idempotente por refId)
  const refId = `cr_${session.user.id}_${Date.now()}`;
  const deb = await walletApplyDelta(supabaseAdmin as any, {
    userId: session.user.id,
    deltaBalance: -betAmount,
    deltaBonus: 0,
    deltaLocked: 0,
    reason: "crash_bet",
    refId,
    method: "CRASH",
  });

  if (!deb.ok) {
    const msg = String(deb.error ?? "");
    if (isInsufficient(msg)) {
      return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });
    }
    return NextResponse.json({ error: "WALLET_ERROR" }, { status: 500 });
  }

  // 2) Crear juego
  const { data: row, error: insErr } = await supabaseAdmin
    .from("crash_sessions")
    .insert({
      user_id: session.user.id,
      bet_amount: betAmount,
      cashout_at: cashoutAt,
      status: "ACTIVE",
      ref_id: refId,
      created_at: new Date().toISOString(),
    })
    .select("id, user_id, bet_amount, cashout_at, status, created_at, ref_id")
    .single();

  if (insErr) {
    // devolver apuesta si no se pudo crear sesión
    await walletApplyDelta(supabaseAdmin as any, {
      userId: session.user.id,
      deltaBalance: betAmount,
      deltaBonus: 0,
      deltaLocked: 0,
      reason: "crash_refund_insert_fail",
      refId: `refund_${refId}`,
      method: "CRASH",
    });

    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, session: row });
}
