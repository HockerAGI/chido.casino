import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Falta firma" }, { status: 400 });

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Firma inválida" }, { status: 400 });
  }

  const okTypes = new Set([
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded"
  ]);

  const failTypes = new Set([
    "checkout.session.async_payment_failed"
  ]);

  if (okTypes.has(event.type)) {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const amount = (session.amount_total ?? 0) / 100;

    if (userId && amount > 0) {
      // Completa el depósito SOLO si sigue PENDIENTE (idempotente)
      await supabaseAdmin.rpc("complete_deposit", {
        p_user_id: userId,
        p_amount: amount,
        p_provider_ref: session.id,
        p_metadata: {
          stripe: {
            sessionId: session.id,
            paymentStatus: session.payment_status,
            paymentIntent: session.payment_intent
          },
          email: session.customer_email
        }
      });
    }
  }

  if (failTypes.has(event.type)) {
    const session = event.data.object as Stripe.Checkout.Session;
    await supabaseAdmin.rpc("fail_deposit", {
      p_provider_ref: session.id,
      p_metadata: { stripe: { sessionId: session.id, failed: true } }
    });
  }

  return NextResponse.json({ received: true });
}