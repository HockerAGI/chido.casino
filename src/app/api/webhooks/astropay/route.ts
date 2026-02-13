export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { walletApplyDelta } from "@/lib/walletApplyDelta";

function isMissingTable(msg: string) {
  const m = msg.toLowerCase();
  return m.includes("relation") && m.includes("does not exist");
}
function isDuplicate(msg: string) {
  const m = msg.toLowerCase();
  return m.includes("duplicate") || m.includes("unique") || m.includes("23505");
}

async function maybeCreditAffiliateFirstDeposit(params: { userId: string; amount: number; intentId: string }) {
  try {
    const reward = Number(process.env.AFFILIATE_FIRST_DEPOSIT_REWARD ?? 20); // MXN
    const min = Number(process.env.AFFILIATE_FIRST_DEPOSIT_MIN ?? 50); // MXN
    if (!Number.isFinite(reward) || reward <= 0) return;
    if (!Number.isFinite(min) || params.amount < min) return;

    const { data: ref, error: refErr } = await supabaseAdmin
      .from("affiliate_referrals")
      .select("id, affiliate_user_id, status, total_deposited, total_commission")
      .eq("referred_user_id", params.userId)
      .maybeSingle();

    if (refErr) {
      if (isMissingTable(String(refErr.message || ""))) return;
      console.error("affiliate_referrals read error:", refErr);
      return;
    }
    if (!ref) return;
    if (ref.status !== "registered") return;

    const refId = `aff_firstdep:${params.intentId}`;

    // Insert comisión (idempotente por ref_id)
    const ins = await supabaseAdmin.from("affiliate_commissions").insert({
      affiliate_user_id: ref.affiliate_user_id,
      referred_user_id: params.userId,
      amount: reward,
      reason: "first_deposit_bonus",
      ref_id: refId,
      status: "credited",
      metadata: { deposit_amount: params.amount, intent_id: params.intentId },
    });

    if (ins.error) {
      if (isMissingTable(String(ins.error.message || ""))) return;
      if (isDuplicate(String(ins.error.message || ""))) return; // ya se pagó
      console.error("affiliate_commissions insert error:", ins.error);
      return;
    }

    // Credit wallet del afiliado
    const credit = await walletApplyDelta(supabaseAdmin, {
      userId: ref.affiliate_user_id,
      deltaBalance: reward,
      deltaBonus: 0,
      deltaLocked: 0,
      reason: "affiliate_first_deposit",
      refId,
      metadata: { referred_user_id: params.userId, intent_id: params.intentId },
    });

    if (credit.error) {
      // AQUÍ ESTÁ BIEN (usar credit.error directo en logs)
      console.error("affiliate wallet credit error:", credit.error);
      // rollback best-effort
      await supabaseAdmin.from("affiliate_commissions").delete().eq("ref_id", refId);
      return;
    }

    // Update referral stats
    await supabaseAdmin
      .from("affiliate_referrals")
      .update({
        status: "first_deposit",
        total_deposited: Number(ref.total_deposited || 0) + params.amount,
        total_commission: Number(ref.total_commission || 0) + reward,
      })
      .eq("id", ref.id);
  } catch (e) {
    console.error("maybeCreditAffiliateFirstDeposit error:", e);
  }
}

export async function POST(req: Request) {
  const sig = req.headers.get("x-astropay-signature");
  const bodyText = await req.text();

  // TODO: valida firma si AstroPay la requiere en tu contrato (depende del setup).
  // Por ahora: seguimos el flujo actual.

  let payload: any = null;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }

  // Normalización mínima (según tu integración actual)
  const intentId = String(payload?.intent_id || payload?.intentId || payload?.data?.intent_id || "").trim();
  if (!intentId) return NextResponse.json({ ok: false, error: "NO_INTENT" }, { status: 400 });

  // 1) buscar intent (tabla tuya)
  const { data: intent, error: iErr } = await supabaseAdmin
    .from("deposit_intents")
    .select("*")
    .eq("intent_id", intentId)
    .maybeSingle();

  if (iErr) return NextResponse.json({ ok: false, error: iErr.message }, { status: 500 });
  if (!intent) return NextResponse.json({ ok: true }); // idempotente: si no existe, no tronamos

  // 2) si ya estaba acreditado, no duplicar
  if (intent.status === "credited") return NextResponse.json({ ok: true });

  // 3) validar status “success”
  const status = String(payload?.status || payload?.data?.status || "success").toLowerCase();
  if (!["success", "paid", "credited", "approved"].includes(status)) {
    // marca fallido / pendiente si quieres
    await supabaseAdmin.from("deposit_intents").update({ status: "failed" }).eq("intent_id", intentId);
    return NextResponse.json({ ok: true });
  }

  const userId = String(intent.user_id);
  const amount = Number(intent.amount || 0);

  // 4) acreditar wallet del usuario
  const refId = `astropay_deposit:${intentId}`;

  const apply = await walletApplyDelta(supabaseAdmin, {
    userId,
    deltaBalance: amount,
    deltaBonus: 0,
    deltaLocked: 0,
    reason: "deposit_astropay",
    refId,
    metadata: { intent_id: intentId },
  });

  // CORRECCIÓN AQUÍ: Usamos apply.error directo (es string)
  if (apply.error) return NextResponse.json({ ok: false, error: apply.error }, { status: 500 });

  // 5) marcar intent acreditado
  await supabaseAdmin.from("deposit_intents").update({ status: "credited" }).eq("intent_id", intentId);

  // 6) ✅ Afiliados: primer depósito = comisión (best-effort)
  await maybeCreditAffiliateFirstDeposit({ userId, amount, intentId });

  return NextResponse.json({ ok: true });
}