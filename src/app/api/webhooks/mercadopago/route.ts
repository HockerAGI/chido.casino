export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { walletApplyDelta } from "@/lib/walletApplyDelta";
import { creditAffiliateFirstDepositBonus } from "@/lib/depositBonuses";
import { getPayment, verifyWebhookSignature } from "@/lib/mercadopago";

function isDuplicate(msg: string) {
  const m = (msg || "").toLowerCase();
  return m.includes("duplicate") || m.includes("unique") || m.includes("23505");
}

function extractQueryDataId(req: Request) {
  const url = new URL(req.url);
  return url.searchParams.get("data.id") || url.searchParams.get("data_id");
}

function extractPaymentId(payload: any, req: Request) {
  const url = new URL(req.url);
  return (
    extractQueryDataId(req) ||
    url.searchParams.get("payment_id") ||
    url.searchParams.get("id") ||
    payload?.data?.id ||
    payload?.data?.payment_id ||
    payload?.payment_id ||
    payload?.id
  );
}

async function parsePayload(rawBody: string, req: Request) {
  if (rawBody) {
    try {
      return JSON.parse(rawBody);
    } catch {
      return null;
    }
  }

  const paymentId = extractPaymentId(null, req);
  return paymentId ? { type: "payment", data: { id: paymentId } } : null;
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const payload = await parsePayload(rawBody, req);
    const paymentId = extractPaymentId(payload, req);

    const sig = verifyWebhookSignature(
      req.headers.get("x-signature"),
      req.headers.get("x-request-id"),
      extractQueryDataId(req) || paymentId
    );
    if (sig.enforced && !sig.ok) {
      return NextResponse.json({ ok: false, error: "INVALID_SIGNATURE" }, { status: 401 });
    }

    if (!payload && !paymentId) {
      return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
    }
    if (!paymentId) {
      return NextResponse.json({ ok: true });
    }

    const payment = await getPayment(paymentId);
    if (!payment.ok) {
      console.error("Mercado Pago webhook: failed to fetch payment", payment.error);
      return NextResponse.json({ ok: false, error: "PAYMENT_FETCH_FAILED" }, { status: 502 });
    }

    const externalRef = payment.externalReference;
    let intent: any | null = null;

    if (externalRef) {
      const byRef = await supabaseAdmin
        .from("deposit_intents")
        .select("*")
        .eq("intent_id", externalRef)
        .maybeSingle();

      if (byRef.error) {
        console.error("Mercado Pago webhook: intent lookup error", byRef.error);
        return NextResponse.json({ ok: false, error: "INTENT_LOOKUP_FAILED" }, { status: 500 });
      }
      intent = byRef.data || null;
    }

    if (!intent) {
      const byExternalId = await supabaseAdmin
        .from("deposit_intents")
        .select("*")
        .eq("external_id", String(paymentId))
        .maybeSingle();

      if (byExternalId.error) {
        console.error("Mercado Pago webhook: external intent lookup error", byExternalId.error);
        return NextResponse.json({ ok: false, error: "EXTERNAL_INTENT_LOOKUP_FAILED" }, { status: 500 });
      }
      intent = byExternalId.data || null;
    }

    if (!intent || String(intent.provider || "") !== "mercadopago") {
      return NextResponse.json({ ok: true });
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
  if (intent.status === "credited") {
    return NextResponse.json({ ok: true });
  }

  const status = String(payment.status || "").toLowerCase();

  if (status !== "approved") {
    const { error } = await supabaseAdmin
      .from("deposit_intents")
      .update({
        status: ["rejected", "cancelled", "failure"].includes(status) ? "failed" : "pending",
        external_id: paymentId,
        provider_payload: { payment_id: paymentId, status: payment.status },
      } as any)
      .eq("id", intent.id);

    if (error) {
      console.error("Mercado Pago pending intent update error:", error);
      return NextResponse.json({ ok: false, error: "INTENT_UPDATE_FAILED" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  const userId = String(intent.user_id);
  const amount = Number(intent.amount || payment.amount || 0);
  if (!userId || amount <= 0) return NextResponse.json({ ok: true });

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
    if (isDuplicate(String(apply.error))) {
      const { error } = await supabaseAdmin
        .from("deposit_intents")
        .update({ status: "credited", external_id: paymentId })
        .eq("id", intent.id);

      if (error) {
        console.error("Mercado Pago duplicate credit intent update error:", error);
        return NextResponse.json({ ok: false, error: "INTENT_UPDATE_FAILED" }, { status: 500 });
      }

      return NextResponse.json({ ok: true });
    }
    console.error("Mercado Pago wallet credit error:", apply.error);
    return NextResponse.json({ ok: false, error: apply.error }, { status: 500 });
  }

  const { error: updateError } = await supabaseAdmin
    .from("deposit_intents")
    .update({
      status: "credited",
      external_id: paymentId,
      provider_payload: { payment_id: paymentId, status: payment.status, amount },
    } as any)
    .eq("id", intent.id);

  if (updateError) {
    console.error("Mercado Pago credited intent update error:", updateError);
    return NextResponse.json({ ok: false, error: "INTENT_UPDATE_FAILED" }, { status: 500 });
  }

  await creditAffiliateFirstDepositBonus(supabaseAdmin, { userId, amount, intentId: intent.intent_id });

  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  return POST(req);
}
