import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import {
  astroPayCreatePayment,
  pickProviderReference,
  type AstroPayMethod,
  isAstroPayConfigured,
} from "@/lib/astropay";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function siteUrl(req: Request) {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  const u = new URL(req.url);
  return `${u.protocol}//${u.host}`;
}

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const amount = Number(body?.amount);
    const method = (body?.method as AstroPayMethod) || "spei";

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
    }
    if (!["spei", "oxxo", "card"].includes(method)) {
      return NextResponse.json({ error: "Método inválido" }, { status: 400 });
    }

    if (!isAstroPayConfigured()) {
      return NextResponse.json(
        { error: "CONFIG_MISSING:ASTROPAY" },
        { status: 501 }
      );
    }

    const base = siteUrl(req);
    const externalId = `dep_${session.user.id}_${Date.now()}`;

    const payload = await astroPayCreatePayment({
      amount,
      currency: "MXN",
      method,
      externalId,
      userId: session.user.id,
      userEmail: session.user.email || "",
      returnUrl: `${base}/wallet?deposit=ok`,
      webhookUrl: `${base}/api/webhooks/astropay`,
      description: `Depósito ${method.toUpperCase()} - Chido`,
    });

    const providerReference = pickProviderReference(payload, externalId);
    const instructions =
      payload?.instructions ||
      payload?.payment_instructions ||
      payload?.spei ||
      payload?.oxxo ||
      payload?.bank_transfer ||
      payload?.cash ||
      null;

    // INSERT CON SERVICE ROLE (más seguro; el usuario no debe escribir intents libremente)
    await supabaseAdmin.from("deposit_intents").insert({
      user_id: session.user.id,
      provider: "astropay",
      method,
      amount,
      currency: "MXN",
      status: "pending",
      external_id: externalId,
      provider_reference: providerReference,
      provider_payload: payload,
      instructions,
    });

    const redirectUrl = payload?.url || payload?.redirect_url || payload?.payment_url || null;

    return NextResponse.json({
      ok: true,
      provider: "astropay",
      method,
      externalId,
      providerReference,
      redirectUrl,
      instructions,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Error interno" }, { status: 500 });
  }
}