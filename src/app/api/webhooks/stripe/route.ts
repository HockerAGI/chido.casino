import { NextResponse } from "next/server";
import type StripeType from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return new NextResponse("Missing Stripe signature", { status: 400 });
  }

  const body = await req.text();

  let event: StripeType.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err: any) {
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as StripeType.Checkout.Session;

      if (session.payment_status === "paid") {
        const { error } = await supabaseAdmin.rpc("confirm_deposit", {
          p_session_id: session.id,
          p_payment_intent_id: session.payment_intent as string | null
        });

        if (error) {
          // Stripe puede reintentar, NO lanzar 500
          return NextResponse.json({
            received: true,
            rpc_error: error.message
          });
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    return new NextResponse(`Webhook handler failed: ${e.message}`, {
      status: 500
    });
  }
}