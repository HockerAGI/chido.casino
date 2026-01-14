import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // 1. Validar Usuario
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { amount } = await req.json();
    const userId = session.user.id;
    const depositId = `dep-${Date.now()}`;

    // 2. Configuración AstroPay (Sandbox para pruebas)
    // Cuando tengas credenciales reales, cámbialas en tus variables de entorno (.env)
    const ASTROPAY_LOGIN = process.env.ASTROPAY_LOGIN || "tu_login_sandbox";
    const ASTROPAY_KEY = process.env.ASTROPAY_KEY || "tu_key_sandbox";
    const IS_PRODUCTION = process.env.NODE_ENV === 'production';
    
    const apiUrl = IS_PRODUCTION 
        ? "https://api.astropay.com/merchant/v1/create_payment" // URL Real
        : "https://sandbox-api.astropay.com/merchant/v1/create_payment"; // URL Pruebas

    // 3. Payload para AstroPay
    const payload = {
      "amount": amount,
      "currency": "MXN",
      "country": "MX",
      "merchant_reference": depositId,
      "payment_methods": ["SPEI", "OXXO", "CREDIT_CARD"], 
      "return_url": `${process.env.NEXT_PUBLIC_SITE_URL}/wallet?deposit=ok`,
      "callback_url": `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/astropay`,
      "user": {
          "id": userId,
          "email": session.user.email
      }
    };

    // 4. Si no hay llaves configuradas, simulamos para no romper el demo
    if (ASTROPAY_LOGIN === "tu_login_sandbox") {
        console.warn("⚠️ MODO SIMULACIÓN: Configura ASTROPAY_LOGIN en .env");
        // Devolvemos URL ficticia de éxito inmediato
        return NextResponse.json({ url: `/wallet?deposit=ok&simulated=true` });
    }

    // 5. Llamada Real a AstroPay
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ADT-Login": ASTROPAY_LOGIN,
        "ADT-Key": ASTROPAY_KEY
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.url) {
        return NextResponse.json({ url: data.url });
    } else {
        throw new Error(data.message || "Error contactando AstroPay");
    }

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}