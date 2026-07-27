export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createCheckoutPreference, isMercadoPagoConfigured } from "@/lib/mercadopago";
import { getSelfExclusionState } from "@/lib/responsibleGaming";
import { fraudLog, velocityLimit } from "@/lib/fraud";

function folio() {
  return `CHDMP-${Math.random().toString(36).slice(2, 8).toUpperCase()}-${Date.now().toString().slice(-5)}`;
}

export async function POST(req: Request) {
  try {
    if (!isMercadoPagoConfigured()) {
      return NextResponse.json(
        { ok: false, error: "Mercado Pago no está configurado todavía." },
        { status: 503 }
      );
    }

    const session = await getServerSession(req);
    if (!session) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    // Self-exclusion check
    const ex = await getSelfExclusionState(supabaseAdmin as any, session.user.id);
    if (ex.ok && ex.excluded) {
      return NextResponse.json(
        {
          ok: false,
          error: "SELF_EXCLUDED",
          message: "Autoexclusión activa. No puedes depositar por ahora.",
          until: ex.until,
        },
        { status: 403 }
      );
    }

    // Velocity limit: 5 deposits in 30 min
    const lim = await velocityLimit(supabaseAdmin as any, "deposit_intents", {
      userId: session.user.id,
      minutes: 30,
      max: 5,
    });
    if (!lim.ok) {
      return NextResponse.json({ ok: false, error: "RATE_LIMIT", message: lim.error }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const amount = Number(body?.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ ok: false, error: "Monto inválido" }, { status: 400 });
    }

    // Minimum deposit: 20 MXN, maximum: 50,000 MXN (per transaction)
    if (amount < 20) {
      return NextResponse.json(
        { ok: false, error: "El depósito mínimo es de $20 MXN." },
        { status: 400 }
      );
    }
    if (amount > 50000) {
      return NextResponse.json(
        { ok: false, error: "El depósito máximo es de $50,000 MXN por transacción." },
        { status: 400 }
      );
    }

    const f = folio();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://chido.casino";
    const notificationUrl = `${siteUrl}/api/webhooks/mercadopago`;

    // Create the preference in Mercado Pago
    const pref = await createCheckoutPreference({
      userId: session.user.id,
      userEmail: session.user.email ?? null,
      amount,
      concept: f,
      notificationUrl,
    });

    if (!pref.ok) {
      return NextResponse.json({ ok: false, error: pref.error }, { status: 500 });
    }

    // Record the deposit intent in the database
    const { error: insErr } = await supabaseAdmin.from("deposit_intents").insert({
      user_id: session.user.id,
      provider: "mercadopago",
      method: "card",
      amount,
      currency: "MXN",
      status: "pending",
      intent_id: f,
      external_id: pref.preferenceId ?? null,
      checkout_url: pref.initPoint || pref.sandboxInitPoint || null,
      metadata: {
        folio: f,
        preference_id: pref.preferenceId,
        provider: "mercadopago",
      },
    } as any);

    if (insErr) {
      // Don't fail the request — the preference was already created
      console.error("Failed to record Mercado Pago deposit intent:", insErr);
    }

    await fraudLog(supabaseAdmin as any, req, {
      userId: session.user.id,
      eventType: "mp_deposit_created",
      metadata: { folio: f, amount, preference_id: pref.preferenceId },
    });

    return NextResponse.json({
      ok: true,
      preferenceId: pref.preferenceId,
      initPoint: pref.initPoint,
      sandboxInitPoint: pref.sandboxInitPoint,
      folio: f,
      message: "¡Listo! Te mandamos al checkout de Mercado Pago.",
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Error interno" },
      { status: 500 }
    );
  }
}
