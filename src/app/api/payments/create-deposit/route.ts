import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { amountMXN, userId, email } = await req.json();

    const amount = Number(amountMXN);
    if (!userId || !email || !amount || amount < 10) {
      return NextResponse.json({ error: "Datos inválidos (monto mínimo 10)" }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      locale: "es",
      payment_method_types: ["card", "oxxo"],
      customer_email: email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "mxn",
            unit_amount: Math.round(amount * 100),
            product_data: { name: "Créditos digitales" }
          }
        }
      ],
      metadata: { userId },
      success_url: `${baseUrl}/wallet?deposit=ok`,
      cancel_url: `${baseUrl}/wallet?deposit=cancel`
    });

    // Creamos transacción PENDIENTE (idempotente por provider_ref)
    await supabaseAdmin.rpc("create_pending_deposit", {
      p_user_id: userId,
      p_amount: amount,
      p_provider_ref: session.id,
      p_metadata: { stripe: { sessionId: session.id }, email }
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error creando depósito" }, { status: 500 });
  }
}