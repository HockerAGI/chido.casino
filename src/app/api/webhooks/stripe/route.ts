import "server-only";

export const runtime = "nodejs";

import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16"
});

export async function POST(req: Request) {
  // 1️⃣ Leer body crudo (OBLIGATORIO)
  const body = await req.text();
  const signature = headers().get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return new NextResponse("Missing webhook signature", { status: 400 });
  }

  let event: Stripe.Event;

  // 2️⃣ Verificar firma (seguridad crítica)
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error("❌ Stripe signature error:", err.message);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  // 3️⃣ Procesar solo cuando el dinero YA entró
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status === "paid") {
      const userId = session.metadata?.userId;
      const amount = (session.amount_total ?? 0) / 100;
      const providerRef = session.payment_intent as string;

      if (!userId || amount <= 0) {
        return NextResponse.json({ received: true });
      }

      // 4️⃣ Insertar transacción (idempotente por índice único)
      const { error } = await supabaseAdmin.from("transactions").insert({
        user_id: userId,
        amount,
        type: "DEPOSIT",
        status: "COMPLETED",
        provider_ref: providerRef
      });

      // 5️⃣ Manejo explícito de duplicados
      if (error) {
        // 23505 = unique_violation (Stripe reintentó)
        if ((error as any).code === "23505") {
          console.log("🛑 Transacción duplicada ignorada:", providerRef);
          return NextResponse.json({ received: true });
        }

        console.error("❌ Error insertando transacción:", error);
        return new NextResponse("Database error", { status: 500 });
      }

      // 6️⃣ Actualizar saldo de forma controlada (Numia)
      const { error: balanceError } = await supabaseAdmin.rpc(
        "increment_balance",
        {
          user_uuid: userId,
          amount_to_add: amount
        }
      );

      if (balanceError) {
        console.error("❌ Error actualizando saldo:", balanceError);
        return new NextResponse("Balance update error", { status: 500 });
      }

      console.log(`✅ Depósito acreditado: $${amount} → ${userId}`);
    }
  }

  // 7️⃣ Stripe exige 200 OK siempre que recibas el evento
  return NextResponse.json({ received: true });
}