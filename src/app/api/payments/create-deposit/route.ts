import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  try {
    // 1. Validación robusta del body
    const body = await req.json().catch(() => null);
    if (!body) return jsonError("Payload inválido");

    const { amount } = body;
    const mxn = Number(amount);

    if (!Number.isFinite(mxn) || mxn < 50 || mxn > 50000) {
      return jsonError("Monto inválido (min 50, max 50000).");
    }

    // 2. Validar autenticación
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return jsonError("No token provided", 401);

    const token = authHeader.replace("Bearer ", "");

    // Usamos cliente anónimo para validar que el token del usuario es real
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData?.user) return jsonError("Invalid token", 401);

    const userId = userData.user.id;

    // 3. Obtener origen seguro para redirección
    const reqUrl = new URL(req.url);
    const host = req.headers.get("x-forwarded-host") || reqUrl.host;
    const protocol = req.headers.get("x-forwarded-proto") || reqUrl.protocol.replace(":", "");
    const origin = `${protocol}://${host}`;

    // 4. Crear sesión de Checkout en Stripe
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card", "oxxo"],
      line_items: [
        {
          price_data: {
            currency: "mxn",
            product_data: { name: "Chido Casino Deposit" },
            unit_amount: Math.round(mxn * 100)
          },
          quantity: 1
        }
      ],
      metadata: { userId },
      success_url: `${origin}/wallet?deposit=ok`,
      cancel_url: `${origin}/wallet?deposit=cancel`
    });

    // 5. Insertar transacción en BD
    // CORRECCIÓN: Añadimos 'type: "deposit"' para satisfacer a la base de datos
    const { error: txError } = await supabaseAdmin.from("transactions").insert([
      {
        user_id: userId,
        amount: mxn,
        status: "pending",
        type: "deposit", // <--- ESTA ES LA LÍNEA QUE FALTABA
        stripe_checkout_session_id: session.id
      }
    ]);

    if (txError) {
      console.error("Tx Insert Error DETALLADO:", txError);
      return jsonError(`DB ERROR: ${txError.message} (Code: ${txError.code})`, 500);
    }

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Deposit Error:", error);
    return jsonError(`Deposit create error: ${error.message}`, 500);
  }
}
