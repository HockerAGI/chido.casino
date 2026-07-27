export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { walletApplyDelta } from "@/lib/walletApplyDelta";
import { getPayment, verifyWebhookSignature } from "@/lib/mercadopago";

function isMissingTable(msg: string) {
  const m = (msg || "").toLowerCase();
  return m.includes("relation") && m.includes("does not exist");
}
function isDuplicate(msg: string) {
  const m = (msg || "").toLowerCase();
  return m.includes("duplicate") || m.includes("unique") || m.includes("23505");
}

/**
 * Mercado Pago Webhook / IPN Handler
 *
 * Mercado Pago sends notifications when a payment status changes.
 * The notification contains a payment_id which we use to fetch the
 * full payment details from the Mercado Pago API and credit the user's balance.
 *
 * Notifications come in two formats:
 * 1. POST with JSON body: { type: "payment", data: { id: "123456789" } }
 * 2. GET with query params: ?type=payment&data.id=123456789&topic=merchant_order
 *
 * We handle both formats and verify the payment via the API.
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get("x-signature");
    const xRequestId = req.headers.get("x-request-id");

    // Verify webhook signature (if configured)
    const sig = verifyWebhookSignature(rawBody, signatureHeader, xRequestId);
    if (sig.enforced && !sig.ok) {
      return NextResponse.json(
        { ok: false, error: "INVALID_SIGNATURE" },
        { status: 401 }
      );
    }

    // Parse the notification
    let payload: any = null;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      // If it's not JSON, try query params
      const url = new URL(req.url);
      const paymentId = url.searchParams.get("data.id") || url.searchParams.get("payment_id");
      if (paymentId) {
        payload = { type: "payment", data: { id: paymentId } };
      } else {
        return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
      }
    }

    // Extract the payment ID from various notification formats
    const paymentId =
      payload?.data?.id ||
      payload?.data?.payment_id ||
      payload?.payment_id ||
      payload?.id;

    if (!paymentId) {
      // Could be a merchant_order notification or other type — acknowledge silently
      return NextResponse.json({ ok: true });
    }

    // Fetch the actual payment from Mercado Pago API to verify
    const payment = await getPayment(paymentId);
    if (!payment.ok) {
      console.error("Mercado Pago webhook: failed to fetch payment", payment.error);
      return NextResponse.json({ ok: true }); // Ack to prevent retries, log error
    }

    // Find the deposit intent by external_reference (which is our folio)
    const externalRef = payment.externalReference;
    if (!externalRef) {
      return NextResponse.json({ ok: true });
    }

    const { data: intent, error: iErr } = await supabaseAdmin
      .from("deposit_intents")
      .select("*")
      .eq("intent_id", externalRef)
      .maybeSingle();

    if (iErr) {
      console.error("Mercado Pago webhook: intent lookup error", iErr);
      return NextResponse.json({ ok: true });
    }
    if (!intent) {
      // Also try external_id (which stores the preference ID)
      const { data: intentByExt } = await supabaseAdmin
        .from("deposit_intents")
        .select("*")
        .eq("external_id", String(paymentId))
        .maybeSingle();

      if (!intentByExt) return NextResponse.json({ ok: true });
      return await processPayment(String(paymentId), payment, intentByExt);
    }

    return await processPayment(String(paymentId), payment, intent);
  } catch (e: any) {
    console.error("Mercado Pago webhook error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Error interno" }, { status: 500 });
  }
}

async function processPayment(
  paymentId: string,
  payment: { status?: string; amount?: number; externalReference?: string; paymentMethod?: string },
  intent: any
) {
  // Idempotency: if already credited, skip
  if (intent.status === "credited") {
    return NextResponse.json({ ok: true });
  }

  const status = String(payment.status || "").toLowerCase();

  // Only credit on approved status
  if (status !== "approved") {
    if (["rejected", "cancelled", "failure"].includes(status)) {
      await supabaseAdmin
        .from("deposit_intents")
        .update({ status: "failed" })
        .eq("id", intent.id);
    } else {
      // pending, in_process, etc. — update status
      await supabaseAdmin
        .from("deposit_intents")
        .update({ status: "pending", external_id: paymentId })
        .eq("id", intent.id);
    }
    return NextResponse.json({ ok: true });
  }

  // Payment approved — credit the user's balance
  const userId = String(intent.user_id);
  const amount = Number(intent.amount || payment.amount || 0);

  if (amount <= 0) {
    return NextResponse.json({ ok: true });
  }

  const refId = `mp_deposit:${intent.intent_id}`;

  const apply = await walletApplyDelta(supabaseAdmin, {
    userId,
    deltaBalance: amount,
    deltaBonus: 0,
    deltaLocked: 0,
    reason: "deposit_mercadopago",
    refId,
    metadata: {
      payment_id: paymentId,
      intent_id: intent.intent_id,
      method: payment.paymentMethod,
    },
  });

  if (apply.error) {
    // If duplicate, the deposit was already credited — mark as credited
    if (isDuplicate(String(apply.error))) {
      await supabaseAdmin
        .from("deposit_intents")
        .update({ status: "credited", external_id: paymentId })
        .eq("id", intent.id);
      return NextResponse.json({ ok: true });
    }
    console.error("Mercado Pago wallet credit error:", apply.error);
    return NextResponse.json({ ok: false, error: apply.error }, { status: 500 });
  }

  // Mark intent as credited
  await supabaseAdmin
    .from("deposit_intents")
    .update({
      status: "credited",
      external_id: paymentId,
      provider_payload: { payment_id: paymentId, status: payment.status, amount },
    })
    .eq("id", intent.id);

  // Credit affiliate first-deposit bonus (best-effort)
  await maybeCreditAffiliateFirstDeposit({ userId, amount, intentId: intent.intent_id });

  return NextResponse.json({ ok: true });
}

async function maybeCreditAffiliateFirstDeposit(params: {
  userId: string;
  amount: number;
  intentId: string;
}) {
  try {
    const reward = Number(process.env.AFFILIATE_FIRST_DEPOSIT_REWARD ?? 20);
    const min = Number(process.env.AFFILIATE_FIRST_DEPOSIT_MIN ?? 50);
    if (!Number.isFinite(reward) || reward <= 0) return;
    if (!Number.isFinite(min) || params.amount < min) return;

    const { data: ref, error: refErr } = await supabaseAdmin
      .from("affiliate_referrals")
      .select("id, affiliate_user_id, status, total_deposited, total_commission")
      .eq("referred_user_id", params.userId)
      .maybeSingle();

    if (refErr) {
      if (isMissingTable(String(refErr.message || ""))) return;
      return;
    }
    if (!ref || ref.status !== "registered") return;

    const refId = `aff_firstdep:${params.intentId}`;

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
      if (isDuplicate(String(ins.error.message || ""))) return;
      return;
    }

    await walletApplyDelta(supabaseAdmin, {
      userId: ref.affiliate_user_id,
      deltaBalance: reward,
      deltaBonus: 0,
      deltaLocked: 0,
      reason: "affiliate_first_deposit",
      refId,
      metadata: { referred_user_id: params.userId, intent_id: params.intentId },
    });

    await supabaseAdmin
      .from("affiliate_referrals")
      .update({
        status: "first_deposit",
        total_deposited: Number(ref.total_deposited || 0) + params.amount,
        total_commission: Number(ref.total_commission || 0) + reward,
      })
      .eq("id", ref.id);
  } catch {
    // silent
  }
}

// Also handle GET for IPN-style notifications with query params
export async function GET(req: Request) {
  return POST(req);
}
