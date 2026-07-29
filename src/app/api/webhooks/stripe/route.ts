export const runtime = "nodejs";

import crypto from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { walletApplyDelta } from "@/lib/walletApplyDelta";
import { creditAffiliateFirstDepositBonus } from "@/lib/depositBonuses";

function isDuplicate(msg: string) {
  const m = (msg || "").toLowerCase();
  return m.includes("duplicate") || m.includes("unique") || m.includes("23505");
}

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
  if (!timestamp || !signature) return false;

  const ageMs = Math.abs(Date.now() - Number(timestamp) * 1000);
  const toleranceMs = Number(process.env.STRIPE_WEBHOOK_TOLERANCE_SECONDS || 300) * 1000;
  if (Number.isFinite(ageMs) && ageMs > toleranceMs) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  const a = Buffer.from(signature, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const rawBody = await req.text();

  if (!verifyStripeSignature(rawBody, req.headers.get("stripe-signature"))) {
    return NextResponse.json({ ok: false, error: "INVALID_SIGNATURE" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  if (event?.type !== "checkout.session.completed") {
    return NextResponse.json({ ok: true });
  }

  const checkoutSession = event?.data?.object || {};
  if (checkoutSession.payment_status !== "paid") {
    return NextResponse.json({ ok: true });
  }

  const folio = String(checkoutSession.metadata?.folio || checkoutSession.client_reference_id || "").trim();
  if (!folio) return NextResponse.json({ ok: true });

  let intent: any | null = null;
  const byFolio = await supabaseAdmin
    .from("deposit_intents")
    .select("*")
    .eq("intent_id", folio)
    .maybeSingle();

  if (!byFolio.error && byFolio.data) {
    intent = byFolio.data;
  } else {
    const bySession = await supabaseAdmin
      .from("deposit_intents")
      .select("*")
      .eq("external_id", String(checkoutSession.id || ""))
      .maybeSingle();
    if (!bySession.error && bySession.data) intent = bySession.data;
  }

  if (!intent || String(intent.provider || "") !== "stripe") {
    return NextResponse.json({ ok: true });
  }
  if (intent.status === "credited") {
    return NextResponse.json({ ok: true });
  }

  const userId = String(intent.user_id || checkoutSession.metadata?.user_id || "");
  const amount = Number(intent.amount || Number(checkoutSession.amount_total || 0) / 100 || 0);
  if (!userId || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ ok: true });
  }

  const refId = `stripe_deposit:${intent.intent_id}`;
  const apply = await walletApplyDelta(supabaseAdmin, {
    userId,
    deltaBalance: amount,
    deltaBonus: 0,
    deltaLocked: 0,
    reason: "deposit_stripe",
    refId,
    metadata: {
      checkout_session_id: checkoutSession.id,
      payment_intent: checkoutSession.payment_intent,
      intent_id: intent.intent_id,
    },
  });

  if (apply.error) {
    if (isDuplicate(String(apply.error))) {
      await supabaseAdmin
        .from("deposit_intents")
        .update({ status: "credited", external_id: checkoutSession.id })
        .eq("id", intent.id);
      return NextResponse.json({ ok: true });
    }
    console.error("Stripe wallet credit error:", apply.error);
    return NextResponse.json({ ok: false, error: apply.error }, { status: 500 });
  }

  await supabaseAdmin
    .from("deposit_intents")
    .update({
      status: "credited",
      external_id: checkoutSession.id,
      provider_payload: {
        checkout_session_id: checkoutSession.id,
        payment_intent: checkoutSession.payment_intent,
        status: checkoutSession.payment_status,
        amount,
      },
    } as any)
    .eq("id", intent.id);

  await creditAffiliateFirstDepositBonus(supabaseAdmin, { userId, amount, intentId: intent.intent_id });

  return NextResponse.json({ ok: true });
}
