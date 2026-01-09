import { NextResponse } from "next/server";
import type StripeType from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
// App Router no necesita config de bodyParser: false, usa req.text() directamente.

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return new NextResponse("Missing Stripe signature", { status: 400 });
  }

  let event: StripeType.Event;
  
  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err: any) {
    console.error(`Webhook Signature Error: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as StripeType.Checkout.Session;

      // Solo procesamos si está pagado
      if (session.payment_status === "paid") {
        const paymentIntentId = typeof session.payment_intent === 'string' 
          ? session.payment_intent 
          : (session.payment_intent as any)?.id || null;

        const { error } = await supabaseAdmin.rpc("confirm_deposit", {
          p_session_id: session.id,
          p_payment_intent_id: paymentIntentId
        });

        if (error) {
          console.error("RPC Error:", error);
          // Retornamos 200 para que Stripe no reintente infinitamente si es error lógico de DB
          // pero logueamos el error.
          return NextResponse.json({ received: true, error: error.message }); 
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    console.error("Webhook Handler Error:", e.message);
    return new NextResponse(`Server Error: ${e.message}`, { status: 500 });
  }
}