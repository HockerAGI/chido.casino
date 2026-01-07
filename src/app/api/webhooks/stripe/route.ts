import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16"
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get("stripe-signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return new NextResponse(`Webhook error: ${err.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status === "paid") {
      const userId = session.metadata?.userId;
      const amount = (session.amount_total ?? 0) / 100;
      const providerRef = session.payment_intent as string;

      if (!userId || amount <= 0)
        return NextResponse.json({ received: true });

      const { error } = await supabaseAdmin.from("transactions").insert({
        user_id: userId,
        amount,
        type: "DEPOSIT",
        status: "COMPLETED",
        provider_ref: providerRef
      });

      if (!error) {
        await supabaseAdmin.rpc("increment_balance", {
          user_uuid: userId,
          amount_to_add: amount
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}