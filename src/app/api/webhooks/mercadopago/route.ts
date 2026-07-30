export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { walletApplyDelta } from "@/lib/walletApplyDelta";
import { creditAffiliateFirstDepositBonus } from "@/lib/depositBonuses";
import {
  getPayment,
  verifyWebhookSignature,
  type GetPaymentResult,
} from "@/lib/mercadopago";

function isDuplicate(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("duplicate") ||
    normalized.includes("unique") ||
    normalized.includes("23505")
  );
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
    payload?.data?.id ||
    payload?.data?.payment_id ||
    payload?.payment_id
  );
}

function isPaymentNotification(payload: any, req: Request) {
  const url = new URL(req.url);
  const markers = [
    url.searchParams.get("type"),
    url.searchParams.get("topic"),
    payload?.type,
    payload?.topic,
    payload?.action,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  return Boolean(extractQueryDataId(req)) || markers.some((value) => value.includes("payment"));
}

function parsePayload(rawBody: string) {
  if (!rawBody) return null;
  try {
    return JSON.parse(rawBody);
  } catch {
    return null;
  }
}

function roundMoney(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : Number.NaN;
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchPaymentWithRetry(paymentId: string): Promise<GetPaymentResult> {
  const delays = [0, 300, 900];
  let lastResult: GetPaymentResult = {
    ok: false,
    retryable: true,
    error: "PAYMENT_FETCH_FAILED",
  };

  for (const delay of delays) {
    if (delay > 0) await sleep(delay);
    lastResult = await getPayment(paymentId);
    if (lastResult.ok || !lastResult.retryable) return lastResult;
  }

  return lastResult;
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const payload = parsePayload(rawBody);

    if (!isPaymentNotification(payload, req)) {
      return NextResponse.json({ ok: true, ignored: "NON_PAYMENT_EVENT" });
    }

    const paymentId = String(extractPaymentId(payload, req) || "").trim();
    if (!/^\d+$/.test(paymentId)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_PAYMENT_ID" },
        { status: 400 }
      );
    }

    const signature = verifyWebhookSignature(
      req.headers.get("x-signature"),
      req.headers.get("x-request-id"),
      extractQueryDataId(req) || paymentId
    );
    if (signature.enforced && !signature.ok) {
      return NextResponse.json(
        { ok: false, error: "INVALID_SIGNATURE" },
        { status: 401 }
      );
    }

    const payment = await fetchPaymentWithRetry(paymentId);
    if (!payment.ok) {
      console.warn("Mercado Pago webhook: payment fetch deferred", {
        paymentId,
        statusCode: payment.statusCode,
        error: payment.error,
      });
      return NextResponse.json(
        { ok: false, error: "PAYMENT_FETCH_DEFERRED" },
        { status: payment.retryable ? 503 : 422 }
      );
    }

    const externalReference = String(payment.externalReference || "").trim();
    let intent: any | null = null;

    if (externalReference) {
      const byReference = await supabaseAdmin
        .from("deposit_intents")
        .select("*")
        .eq("intent_id", externalReference)
        .maybeSingle();

      if (byReference.error) {
        console.error("Mercado Pago webhook: intent lookup error", byReference.error);
        return NextResponse.json(
          { ok: false, error: "INTENT_LOOKUP_FAILED" },
          { status: 500 }
        );
      }
      intent = byReference.data || null;
    }

    if (!intent) {
      const byExternalId = await supabaseAdmin
        .from("deposit_intents")
        .select("*")
        .eq("external_id", paymentId)
        .maybeSingle();

      if (byExternalId.error) {
        console.error(
          "Mercado Pago webhook: external intent lookup error",
          byExternalId.error
        );
        return NextResponse.json(
          { ok: false, error: "EXTERNAL_INTENT_LOOKUP_FAILED" },
          { status: 500 }
        );
      }
      intent = byExternalId.data || null;
    }

    if (!intent || String(intent.provider || "") !== "mercadopago") {
      console.warn("Mercado Pago webhook ignored: deposit intent not found", {
        paymentId,
        externalReference,
      });
      return NextResponse.json({ ok: true, ignored: "INTENT_NOT_FOUND" });
    }

    return processPayment(paymentId, payment, intent);
  } catch (error: any) {
    console.error("Mercado Pago webhook error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Error interno" },
      { status: 500 }
    );
  }
}

async function processPayment(
  paymentId: string,
  payment: GetPaymentResult,
  intent: any
) {
  if (intent.status === "credited") {
    return NextResponse.json({ ok: true, idempotent: true });
  }

  const status = String(payment.status || "").toLowerCase();
  if (status !== "approved") {
    const { error } = await supabaseAdmin
      .from("deposit_intents")
      .update({
        status: ["rejected", "cancelled", "failure"].includes(status)
          ? "failed"
          : "pending",
        external_id: paymentId,
        provider_payload: {
          payment_id: paymentId,
          status: payment.status,
          status_detail: payment.statusDetail,
        },
      } as any)
      .eq("id", intent.id);

    if (error) {
      console.error("Mercado Pago pending intent update error:", error);
      return NextResponse.json(
        { ok: false, error: "INTENT_UPDATE_FAILED" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  }

  const userId = String(intent.user_id || "").trim();
  const expectedAmount = roundMoney(intent.amount);
  const paidAmount = roundMoney(payment.amount);
  const currency = String(payment.currency || "").toUpperCase();
  const externalReference = String(payment.externalReference || "").trim();

  if (!userId || !Number.isFinite(expectedAmount) || expectedAmount <= 0) {
    return NextResponse.json(
      { ok: false, error: "INVALID_DEPOSIT_INTENT" },
      { status: 422 }
    );
  }

  if (!Number.isFinite(paidAmount) || paidAmount !== expectedAmount || currency !== "MXN") {
    console.error("Mercado Pago webhook: payment validation mismatch", {
      paymentId,
      expectedAmount,
      paidAmount,
      currency,
      intentId: intent.intent_id,
    });
    return NextResponse.json(
      { ok: false, error: "PAYMENT_VALIDATION_MISMATCH" },
      { status: 422 }
    );
  }

  if (externalReference && externalReference !== String(intent.intent_id)) {
    console.error("Mercado Pago webhook: external reference mismatch", {
      paymentId,
      externalReference,
      intentId: intent.intent_id,
    });
    return NextResponse.json(
      { ok: false, error: "EXTERNAL_REFERENCE_MISMATCH" },
      { status: 409 }
    );
  }

  const refId = `mp_deposit:${intent.intent_id}`;
  const applied = await walletApplyDelta(supabaseAdmin, {
    userId,
    deltaBalance: expectedAmount,
    deltaBonus: 0,
    deltaLocked: 0,
    reason: "deposit_mercadopago",
    refId,
    metadata: {
      payment_id: paymentId,
      intent_id: intent.intent_id,
      method: payment.paymentMethod,
      currency,
      verified_amount: paidAmount,
    },
  });

  if (applied.error) {
    if (!isDuplicate(String(applied.error))) {
      console.error("Mercado Pago wallet credit error:", applied.error);
      return NextResponse.json(
        { ok: false, error: applied.error },
        { status: 500 }
      );
    }
  }

  const { error: updateError } = await supabaseAdmin
    .from("deposit_intents")
    .update({
      status: "credited",
      external_id: paymentId,
      provider_payload: {
        payment_id: paymentId,
        status: payment.status,
        status_detail: payment.statusDetail,
        amount: paidAmount,
        currency,
      },
    } as any)
    .eq("id", intent.id);

  if (updateError) {
    console.error("Mercado Pago credited intent update error:", updateError);
    return NextResponse.json(
      { ok: false, error: "INTENT_UPDATE_FAILED" },
      { status: 500 }
    );
  }

  await creditAffiliateFirstDepositBonus(supabaseAdmin, {
    userId,
    amount: expectedAmount,
    intentId: intent.intent_id,
  });

  return NextResponse.json({
    ok: true,
    idempotent: Boolean(applied.idempotent),
  });
}

export async function GET() {
  return NextResponse.json(
    { ok: false, error: "METHOD_NOT_ALLOWED" },
    { status: 405, headers: { Allow: "POST" } }
  );
}
