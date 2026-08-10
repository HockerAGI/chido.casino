export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getPayment, type GetPaymentResult } from "@/lib/mercadopago";
import { verifyFreshMercadoPagoSignature } from "@/lib/mercadopagoWebhookSignature";

function queryDataId(req: Request) {
  const url = new URL(req.url);
  return url.searchParams.get("data.id") || url.searchParams.get("data_id");
}

function paymentIdFrom(payload: unknown, req: Request) {
  const body =
    payload && typeof payload === "object"
      ? (payload as Record<string, any>)
      : {};
  const url = new URL(req.url);
  return (
    queryDataId(req) ||
    url.searchParams.get("payment_id") ||
    body?.data?.id ||
    body?.data?.payment_id ||
    body?.payment_id
  );
}

function isPaymentEvent(payload: unknown, req: Request) {
  const body =
    payload && typeof payload === "object"
      ? (payload as Record<string, any>)
      : {};
  const url = new URL(req.url);
  const markers = [
    url.searchParams.get("type"),
    url.searchParams.get("topic"),
    body?.type,
    body?.topic,
    body?.action,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
  return Boolean(queryDataId(req)) || markers.some((value) => value.includes("payment"));
}

function parsePayload(rawBody: string): unknown {
  if (!rawBody) return null;
  try {
    return JSON.parse(rawBody);
  } catch {
    return null;
  }
}

function roundMoney(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? Math.round((amount + Number.EPSILON) * 100) / 100
    : Number.NaN;
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

async function findIntent(paymentId: string, externalReference: string) {
  if (externalReference) {
    const byReference = await supabaseAdmin
      .from("deposit_intents")
      .select("*")
      .eq("intent_id", externalReference)
      .maybeSingle();
    if (byReference.error) {
      return { intent: null, error: byReference.error.message };
    }
    if (byReference.data) return { intent: byReference.data, error: null };
  }

  const byExternalId = await supabaseAdmin
    .from("deposit_intents")
    .select("*")
    .eq("external_id", paymentId)
    .maybeSingle();
  return {
    intent: byExternalId.data || null,
    error: byExternalId.error?.message || null,
  };
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const payload = parsePayload(rawBody);

    if (!isPaymentEvent(payload, req)) {
      return NextResponse.json({ ok: true, ignored: "NON_PAYMENT_EVENT" });
    }

    const paymentId = String(paymentIdFrom(payload, req) || "").trim();
    if (!/^\d+$/.test(paymentId)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_PAYMENT_ID" },
        { status: 400 }
      );
    }

    const signature = verifyFreshMercadoPagoSignature(
      req.headers.get("x-signature"),
      req.headers.get("x-request-id"),
      queryDataId(req) || paymentId
    );
    if (signature.enforced && !signature.ok) {
      console.warn("Mercado Pago webhook signature rejected", {
        paymentId,
        reason: signature.reason,
      });
      return NextResponse.json(
        { ok: false, error: "INVALID_SIGNATURE", reason: signature.reason },
        { status: 401 }
      );
    }

    const payment = await fetchPaymentWithRetry(paymentId);
    if (!payment.ok) {
      console.warn("Mercado Pago payment fetch deferred", {
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
    const lookup = await findIntent(paymentId, externalReference);
    if (lookup.error) {
      console.error("Mercado Pago intent lookup failed", lookup.error);
      return NextResponse.json(
        { ok: false, error: "INTENT_LOOKUP_FAILED" },
        { status: 500 }
      );
    }

    const intent = lookup.intent;
    if (!intent || String(intent.provider || "") !== "mercadopago") {
      return NextResponse.json({ ok: true, ignored: "INTENT_NOT_FOUND" });
    }
    if (intent.status === "credited") {
      return NextResponse.json({ ok: true, idempotent: true });
    }

    const status = String(payment.status || "").toLowerCase();
    if (status !== "approved") {
      const { error } = await supabaseAdmin
        .from("deposit_intents")
        .update({
          status: ["rejected", "cancelled", "canceled", "failure"].includes(
            status
          )
            ? "failed"
            : "pending",
          external_id: paymentId,
          provider_payload: {
            payment_id: paymentId,
            status: payment.status,
            status_detail: payment.statusDetail,
          },
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", intent.id);

      if (error) {
        console.error("Mercado Pago intent update failed", error);
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

    if (!userId || !Number.isFinite(expectedAmount) || expectedAmount <= 0) {
      return NextResponse.json(
        { ok: false, error: "INVALID_DEPOSIT_INTENT" },
        { status: 422 }
      );
    }
    if (
      !Number.isFinite(paidAmount) ||
      paidAmount !== expectedAmount ||
      currency !== "MXN"
    ) {
      await supabaseAdmin
        .from("deposit_intents")
        .update({
          status: "review_required",
          external_id: paymentId,
          provider_payload: {
            payment_id: paymentId,
            status: payment.status,
            expected_amount: expectedAmount,
            paid_amount: paidAmount,
            currency,
            reason: "PAYMENT_VALIDATION_MISMATCH",
          },
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", intent.id);

      return NextResponse.json(
        { ok: false, error: "PAYMENT_VALIDATION_MISMATCH" },
        { status: 422 }
      );
    }
    if (externalReference && externalReference !== String(intent.intent_id)) {
      return NextResponse.json(
        { ok: false, error: "EXTERNAL_REFERENCE_MISMATCH" },
        { status: 409 }
      );
    }

    const { data, error } = await supabaseAdmin.rpc("credit_deposit_atomic", {
      p_intent_id: String(intent.intent_id),
      p_provider: "mercadopago",
      p_external_id: paymentId,
      p_user_id: userId,
      p_amount: paidAmount,
      p_currency: currency,
      p_provider_payload: {
        payment_id: paymentId,
        status: payment.status,
        status_detail: payment.statusDetail,
        payment_method: payment.paymentMethod,
        external_reference: externalReference || null,
        verified_amount: paidAmount,
        verified_currency: currency,
        source: "webhook",
      },
    });

    if (error) {
      console.error("Mercado Pago atomic credit failed", error);
      return NextResponse.json(
        { ok: false, error: "ATOMIC_CREDIT_FAILED" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      credited: Boolean((data as any)?.credited),
      idempotent: Boolean((data as any)?.idempotent),
    });
  } catch (error) {
    console.error("Mercado Pago webhook error", error);
    return NextResponse.json(
      { ok: false, error: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { ok: false, error: "METHOD_NOT_ALLOWED" },
    { status: 405, headers: { Allow: "POST" } }
  );
}
