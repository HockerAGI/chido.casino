export const runtime = "nodejs";

import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSession } from "@/lib/session";
import { getSelfExclusionState } from "@/lib/responsibleGaming";
import { fraudLog, velocityLimit } from "@/lib/fraud";
import {
  createCheckoutPreference,
  isMercadoPagoConfigured,
} from "@/lib/mercadopago";
import {
  authorizeDepositProvider,
  getPaymentWebhookBaseUrl,
} from "@/lib/paymentPolicy";

type DepositMethod = "mercadopago" | "card" | "spei" | "oxxo";

function folio() {
  const entropy = randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
  return `CHDMP-${entropy}-${Date.now().toString().slice(-5)}`;
}

function normalizeMethod(value: unknown): DepositMethod {
  const method = String(value || "mercadopago").trim().toLowerCase();
  if (["card", "spei", "oxxo", "mercadopago"].includes(method)) {
    return method as DepositMethod;
  }
  return "mercadopago";
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(req);
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const exclusion = await getSelfExclusionState(
      supabaseAdmin as any,
      session.user.id
    );
    if (exclusion.ok && exclusion.excluded) {
      return NextResponse.json(
        {
          ok: false,
          error: "SELF_EXCLUDED",
          message: "Autoexclusion activa. No puedes depositar por ahora.",
          until: exclusion.until,
        },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const amount = Number(body?.amount);
    const rawMethod = String(body?.method || "mercadopago")
      .trim()
      .toLowerCase();

    if (rawMethod === "stripe") {
      const decision = authorizeDepositProvider("stripe");
      return NextResponse.json(
        {
          ok: false,
          error: decision.code,
          message: "Este proveedor no esta autorizado para CHIDO.",
        },
        { status: decision.status }
      );
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { ok: false, error: "INVALID_AMOUNT" },
        { status: 400 }
      );
    }
    if (amount < 20) {
      return NextResponse.json(
        { ok: false, error: "MINIMUM_DEPOSIT_20_MXN" },
        { status: 400 }
      );
    }
    if (amount > 50000) {
      return NextResponse.json(
        { ok: false, error: "MAXIMUM_DEPOSIT_50000_MXN" },
        { status: 400 }
      );
    }

    const policy = authorizeDepositProvider("mercadopago");
    const webhookBaseUrl = getPaymentWebhookBaseUrl();
    if (!policy.allowed || !webhookBaseUrl) {
      return NextResponse.json(
        {
          ok: false,
          error: policy.allowed ? "WEBHOOK_BASE_URL_REQUIRED" : policy.code,
          message:
            "Los depositos permanecen deshabilitados hasta completar los controles regulatorios, de entorno y del proveedor.",
        },
        { status: policy.allowed ? 503 : policy.status }
      );
    }

    const limit = await velocityLimit(
      supabaseAdmin as any,
      "deposit_intents",
      {
        userId: session.user.id,
        minutes: 30,
        max: 5,
      }
    );
    if (!limit.ok) {
      return NextResponse.json(
        { ok: false, error: "RATE_LIMIT", message: limit.error },
        { status: 429 }
      );
    }

    if (!isMercadoPagoConfigured()) {
      return NextResponse.json(
        { ok: false, error: "MERCADOPAGO_NOT_CONFIGURED" },
        { status: 503 }
      );
    }

    const requestedMethod = normalizeMethod(rawMethod);
    const depositFolio = folio();

    const { data: createdIntent, error: insertError } = await supabaseAdmin
      .from("deposit_intents")
      .insert({
        user_id: session.user.id,
        provider: "mercadopago",
        method: requestedMethod,
        amount,
        currency: "MXN",
        status: "created",
        intent_id: depositFolio,
        metadata: {
          folio: depositFolio,
          provider: "mercadopago",
          requested_method: requestedMethod,
          payment_policy: "mercadopago_only_v2",
        },
      } as any)
      .select("id")
      .single();

    if (insertError || !createdIntent?.id) {
      console.error("Failed to create Mercado Pago deposit intent:", insertError);
      return NextResponse.json(
        { ok: false, error: "DEPOSIT_INTENT_CREATE_FAILED" },
        { status: 500 }
      );
    }

    const preference = await createCheckoutPreference({
      userId: session.user.id,
      userEmail: session.user.email ?? null,
      amount,
      concept: depositFolio,
      notificationUrl: `${webhookBaseUrl}/api/webhooks/mercadopago`,
    });

    if (!preference.ok) {
      await supabaseAdmin
        .from("deposit_intents")
        .update({
          status: "failed",
          provider_payload: {
            error: preference.error || "PREFERENCE_CREATE_FAILED",
            source: "checkout_preference",
          },
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", createdIntent.id);

      return NextResponse.json(
        { ok: false, error: "PREFERENCE_CREATE_FAILED" },
        { status: 502 }
      );
    }

    const checkoutUrl =
      preference.initPoint || preference.sandboxInitPoint || null;

    const { error: updateError } = await supabaseAdmin
      .from("deposit_intents")
      .update({
        status: "created",
        external_id: preference.preferenceId ?? null,
        checkout_url: checkoutUrl,
        provider_payload: {
          preference_id: preference.preferenceId ?? null,
          source: "checkout_preference",
          state: "ready_for_payment",
        },
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", createdIntent.id)
      .eq("status", "created");

    if (updateError) {
      console.error("Failed to attach Mercado Pago preference:", updateError);
      return NextResponse.json(
        { ok: false, error: "DEPOSIT_INTENT_UPDATE_FAILED" },
        { status: 500 }
      );
    }

    await fraudLog(supabaseAdmin as any, req, {
      userId: session.user.id,
      eventType: "mercadopago_deposit_created",
      metadata: {
        folio: depositFolio,
        amount,
        preference_id: preference.preferenceId,
        requested_method: requestedMethod,
      },
    });

    return NextResponse.json({
      ok: true,
      mode: "mercadopago",
      message: "Continua en Mercado Pago.",
      preferenceId: preference.preferenceId,
      initPoint: preference.initPoint,
      sandboxInitPoint: preference.sandboxInitPoint,
      checkoutUrl,
      folio: depositFolio,
    });
  } catch (error) {
    console.error("Create deposit error", error);
    return NextResponse.json(
      { ok: false, error: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
