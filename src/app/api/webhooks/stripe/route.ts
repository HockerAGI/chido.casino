export const runtime = "nodejs";

import crypto from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const CREDITABLE_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);

function verifyStripeSignature(rawBody: string, signatureHeader: string | null) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET || "";
  if (!secret || !signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, ...rest] = part.trim().split("=");
      return [key, rest.join("=")];
    })
  );

  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature || !/^\d+$/.test(timestamp) || !/^[a-f0-9]+$/i.test(signature)) {
    return false;
  }

  const ageMs = Math.abs(Date.now() - Number(timestamp) * 1000);
  const toleranceSeconds = Number(process.env.STRIPE_WEBHOOK_TOLERANCE_SECONDS || 300);
  const toleranceMs = (Number.isFinite(toleranceSeconds) ? toleranceSeconds : 300) * 1000;
  if (!Number.isFinite(ageMs) || ageMs > toleranceMs) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  const actualBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

async function findStripeIntent(checkoutSession: Record<string, any>) {
  const folio = String(checkoutSession.metadata?.folio || checkoutSession.client_reference_id || "").trim();
  const sessionId = String(checkoutSession.id || "").trim();

  if (folio) {
    const byFolio = await supabaseAdmin
      .from("deposit_intents")
      .select("*")
      .eq("intent_id", folio)
      .maybeSingle();
    if (byFolio.error) return { intent: null, error: byFolio.error.message };
    if (byFolio.data) return { intent: byFolio.data, error: null };
  }

  if (sessionId) {
    const bySession = await supabaseAdmin
      .from("deposit_intents")
      .select("*")
      .eq("external_id", sessionId)
      .maybeSingle();
    if (bySession.error) return { intent: null, error: bySession.error.message };
    if (bySession.data) return { intent: bySession.data, error: null };
  }

  return { intent: null, error: null };
}

function roundMoney(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : Number.NaN;
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  if (!verifyStripeSignature(rawBody, req.headers.get("stripe-signature"))) {
    return NextResponse.json({ ok: false, error: "INVALID_SIGNATURE" }, { status: 401 });
  }

  let event: Record<string, any>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }

  if (!CREDITABLE_EVENTS.has(String(event?.type || ""))) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const checkoutSession = (event?.data?.object || {}) as Record<string, any>;
  if (checkoutSession.payment_status !== "paid") {
    return NextResponse.json({ ok: true, ignored: "NOT_PAID" });
  }

  const { intent, error: lookupError } = await findStripeIntent(checkoutSession);
  if (lookupError) {
    console.error("Stripe deposit intent lookup failed", lookupError);
    return NextResponse.json({ ok: false, error: "INTENT_LOOKUP_FAILED" }, { status: 500 });
  }
  if (!intent || String(intent.provider || "") !== "stripe") {
    return NextResponse.json({ ok: true, ignored: "INTENT_NOT_FOUND" });
  }
  if (intent.status === "credited") {
    return NextResponse.json({ ok: true, idempotent: true });
  }

  const expectedUserId = String(intent.user_id || "").trim();
  const metadataUserId = String(checkoutSession.metadata?.user_id || "").trim();
  const expectedFolio = String(intent.intent_id || "").trim();
  const metadataFolio = String(
    checkoutSession.metadata?.folio || checkoutSession.client_reference_id || ""
  ).trim();
  const expectedAmount = roundMoney(intent.amount);
  const paidAmount = roundMoney(Number(checkoutSession.amount_total || 0) / 100);
  const expectedCurrency = String(intent.currency || "MXN").toUpperCase();
  const paidCurrency = String(checkoutSession.currency || "").toUpperCase();

  if (
    !expectedUserId ||
    !expectedFolio ||
    !Number.isFinite(expectedAmount) ||
    expectedAmount <= 0 ||
    paidAmount !== expectedAmount ||
    paidCurrency !== expectedCurrency ||
    paidCurrency !== "MXN" ||
    (metadataUserId && metadataUserId !== expectedUserId) ||
    (metadataFolio && metadataFolio !== expectedFolio)
  ) {
    console.error("Stripe payment validation mismatch", {
      sessionId: checkoutSession.id,
      expectedAmount,
      paidAmount,
      expectedCurrency,
      paidCurrency,
      expectedFolio,
      metadataFolio,
      expectedUserId,
      metadataUserId,
    });
    return NextResponse.json({ ok: false, error: "PAYMENT_VALIDATION_MISMATCH" }, { status: 422 });
  }

  const { data, error } = await supabaseAdmin.rpc("credit_deposit_atomic", {
    p_intent_id: expectedFolio,
    p_provider: "stripe",
    p_external_id: String(checkoutSession.id || ""),
    p_user_id: expectedUserId,
    p_amount: paidAmount,
    p_currency: paidCurrency,
    p_provider_payload: {
      checkout_session_id: checkoutSession.id,
      payment_intent: checkoutSession.payment_intent,
      payment_status: checkoutSession.payment_status,
      amount_total: checkoutSession.amount_total,
      currency: paidCurrency,
      event_id: event.id || null,
      event_type: event.type || null,
      source: "webhook",
    },
  });

  if (error) {
    console.error("Stripe atomic deposit credit failed", error);
    return NextResponse.json({ ok: false, error: "ATOMIC_CREDIT_FAILED" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    credited: Boolean((data as any)?.credited),
    idempotent: Boolean((data as any)?.idempotent),
  });
}
