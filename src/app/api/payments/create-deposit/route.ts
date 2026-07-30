export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSession } from "@/lib/session";
import { getSelfExclusionState } from "@/lib/responsibleGaming";
import { fraudLog, velocityLimit } from "@/lib/fraud";
import { createCheckoutPreference, isMercadoPagoConfigured } from "@/lib/mercadopago";
import { createStripeCheckoutSession, isStripeConfigured } from "@/lib/stripe";

type DepositMethod = "mercadopago" | "stripe" | "card" | "spei" | "oxxo";
type Provider = "mercadopago" | "stripe";

const DEFAULT_SITE_URL = "https://chido-casino.vercel.app";
const UNRESOLVED_CANONICAL_SITE_URLS = new Set(["https://chido.casino", "http://chido.casino"]);

function normalizeSiteUrl(value: string | undefined) {
  if (!value) return "";
  try {
    return new URL(value.trim()).origin;
  } catch {
    return "";
  }
}

function getPaymentSiteUrl() {
  const explicitPaymentUrl = normalizeSiteUrl(process.env.PAYMENT_SITE_URL);
  if (explicitPaymentUrl) return explicitPaymentUrl;

  const publicSiteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (!publicSiteUrl || UNRESOLVED_CANONICAL_SITE_URLS.has(publicSiteUrl)) {
    return DEFAULT_SITE_URL;
  }

  return publicSiteUrl;
}

function folio(provider: Provider) {
  const prefix = provider === "stripe" ? "CHDST" : "CHDMP";
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}-${Date.now()
    .toString()
    .slice(-5)}`;
}

function normalizeMethod(value: unknown): DepositMethod {
  const method = String(value || "mercadopago").toLowerCase();
  if (["stripe", "card", "spei", "oxxo", "mercadopago"].includes(method)) {
    return method as DepositMethod;
  }
  return "mercadopago";
}

function providerFor(method: DepositMethod): Provider {
  return method === "stripe" ? "stripe" : "mercadopago";
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(req);
    if (!session) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });

    const ex = await getSelfExclusionState(supabaseAdmin as any, session.user.id);
    if (ex.ok && ex.excluded) {
      return NextResponse.json(
        {
          ok: false,
          error: "SELF_EXCLUDED",
          message: "Autoexclusion activa. No puedes depositar por ahora.",
          until: ex.until,
        },
        { status: 403 }
      );
    }

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
    const requestedMethod = normalizeMethod(body?.method);
    const provider = providerFor(requestedMethod);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ ok: false, error: "Monto invalido" }, { status: 400 });
    }
    if (amount < 20) {
      return NextResponse.json({ ok: false, error: "El deposito minimo es de $20 MXN." }, { status: 400 });
    }
    if (amount > 50000) {
      return NextResponse.json(
        { ok: false, error: "El deposito maximo es de $50,000 MXN por transaccion." },
        { status: 400 }
      );
    }

    const f = folio(provider);
    const siteUrl = getPaymentSiteUrl();

    if (provider === "stripe") {
      if (!isStripeConfigured()) {
        return NextResponse.json({ ok: false, error: "Stripe no esta configurado." }, { status: 503 });
      }

      const sessionResult = await createStripeCheckoutSession({
        userId: session.user.id,
        userEmail: session.user.email ?? null,
        amount,
        concept: f,
      });

      if (!sessionResult.ok || !sessionResult.checkoutUrl) {
        return NextResponse.json(
          { ok: false, error: sessionResult.error || "No se pudo crear el checkout de Stripe." },
          { status: 500 }
        );
      }

      const { error: insErr } = await supabaseAdmin.from("deposit_intents").insert({
        user_id: session.user.id,
        provider: "stripe",
        method: "stripe",
        amount,
        currency: "MXN",
        status: "pending",
        intent_id: f,
        external_id: sessionResult.sessionId ?? null,
        checkout_url: sessionResult.checkoutUrl,
        metadata: {
          folio: f,
          provider: "stripe",
          checkout_session_id: sessionResult.sessionId,
        },
      } as any);

      if (insErr) {
        console.error("Failed to record Stripe deposit intent:", insErr);
        return NextResponse.json(
          { ok: false, error: "No se pudo registrar el deposito de Stripe. No se inicio ningun pago." },
          { status: 500 }
        );
      }

      await fraudLog(supabaseAdmin as any, req, {
        userId: session.user.id,
        eventType: "stripe_deposit_created",
        metadata: { folio: f, amount, checkout_session_id: sessionResult.sessionId },
      });

      return NextResponse.json({
        ok: true,
        mode: "stripe",
        message: "Listo. Te mandamos al checkout de Stripe.",
        checkoutUrl: sessionResult.checkoutUrl,
        sessionId: sessionResult.sessionId,
        folio: f,
      });
    }

    if (!isMercadoPagoConfigured()) {
      return NextResponse.json(
        { ok: false, error: "Mercado Pago no esta configurado todavia." },
        { status: 503 }
      );
    }

    const pref = await createCheckoutPreference({
      userId: session.user.id,
      userEmail: session.user.email ?? null,
      amount,
      concept: f,
      notificationUrl: `${siteUrl}/api/webhooks/mercadopago`,
    });

    if (!pref.ok) {
      return NextResponse.json({ ok: false, error: pref.error }, { status: 500 });
    }

    const checkoutUrl = pref.initPoint || pref.sandboxInitPoint || null;
    const { error: insErr } = await supabaseAdmin.from("deposit_intents").insert({
      user_id: session.user.id,
      provider: "mercadopago",
      method: requestedMethod === "stripe" ? "mercadopago" : requestedMethod,
      amount,
      currency: "MXN",
      status: "pending",
      intent_id: f,
      external_id: pref.preferenceId ?? null,
      checkout_url: checkoutUrl,
      metadata: {
        folio: f,
        preference_id: pref.preferenceId,
        provider: "mercadopago",
        requested_method: requestedMethod,
      },
    } as any);

    if (insErr) {
      console.error("Failed to record Mercado Pago deposit intent:", insErr);
      return NextResponse.json(
        { ok: false, error: "No se pudo registrar el deposito de Mercado Pago. No se inicio ningun pago." },
        { status: 500 }
      );
    }

    await fraudLog(supabaseAdmin as any, req, {
      userId: session.user.id,
      eventType: "mercadopago_deposit_created",
      metadata: { folio: f, amount, preference_id: pref.preferenceId, requested_method: requestedMethod },
    });

    return NextResponse.json({
      ok: true,
      mode: "mercadopago",
      message: "Listo. Te mandamos al checkout de Mercado Pago.",
      preferenceId: pref.preferenceId,
      initPoint: pref.initPoint,
      sandboxInitPoint: pref.sandboxInitPoint,
      checkoutUrl,
      folio: f,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error interno" }, { status: 500 });
  }
}
