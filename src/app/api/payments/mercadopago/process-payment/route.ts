export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSession } from "@/lib/session";
import { fraudLog } from "@/lib/fraud";
import { createPayment, isMercadoPagoConfigured } from "@/lib/mercadopago";
import { authorizeDepositProvider } from "@/lib/paymentPolicy";

const DEFAULT_SITE_URL = "https://chidocasino.vercel.app";

function getPaymentSiteUrl() {
  const candidate = String(
    process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL
  ).trim();

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:") return DEFAULT_SITE_URL;
    return parsed.origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

function depositStatusFromPayment(status?: string) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "approved") return "credited";
  if (["rejected", "cancelled", "canceled", "failure"].includes(normalized)) {
    return "failed";
  }
  return "pending";
}

function normalizeFolio(value: unknown) {
  const folio = String(value || "").trim();
  return /^CHDMP-[A-Z0-9]{6}-[0-9]{5}$/.test(folio) ? folio : "";
}

function roundMoney(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.round(number * 100) / 100
    : Number.NaN;
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

    const policy = authorizeDepositProvider("mercadopago");
    if (!policy.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: policy.code,
          message:
            "Los pagos permanecen deshabilitados hasta completar los controles regulatorios y del proveedor.",
        },
        { status: policy.status }
      );
    }

    if (!isMercadoPagoConfigured()) {
      return NextResponse.json(
        { ok: false, error: "MERCADOPAGO_NOT_CONFIGURED" },
        { status: 503 }
      );
    }

    const body = await req
      .json()
      .catch(() => ({} as Record<string, any>));
    const folio = normalizeFolio(body?.folio);
    const preferenceId = String(body?.preferenceId || "").trim();
    const formData =
      body?.formData && typeof body.formData === "object"
        ? body.formData
        : null;
    const selectedPaymentMethod = String(
      body?.selectedPaymentMethod || ""
    ).trim();

    if (!folio || !formData) {
      return NextResponse.json(
        { ok: false, error: "PAYMENT_DATA_REQUIRED" },
        { status: 400 }
      );
    }

    const { data: intent, error: intentError } = await supabaseAdmin
      .from("deposit_intents")
      .select("*")
      .eq("intent_id", folio)
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (intentError) {
      console.error("Mercado Pago Checkout intent lookup failed", intentError);
      return NextResponse.json(
        { ok: false, error: "INTENT_LOOKUP_FAILED" },
        { status: 500 }
      );
    }
    if (!intent || String(intent.provider || "") !== "mercadopago") {
      return NextResponse.json(
        { ok: false, error: "INTENT_NOT_FOUND" },
        { status: 404 }
      );
    }
    if (intent.status === "credited") {
      return NextResponse.json({
        ok: true,
        status: "approved",
        alreadyCredited: true,
      });
    }
    if (
      ["failed", "cancelled", "canceled", "rejected"].includes(
        String(intent.status || "")
      )
    ) {
      return NextResponse.json(
        { ok: false, error: "INTENT_FINAL" },
        { status: 409 }
      );
    }

    const recordedPreferenceId = String(
      intent.external_id || intent.metadata?.preference_id || ""
    );
    if (
      preferenceId &&
      recordedPreferenceId &&
      preferenceId !== recordedPreferenceId
    ) {
      return NextResponse.json(
        { ok: false, error: "PREFERENCE_MISMATCH" },
        { status: 400 }
      );
    }

    const amount = roundMoney(intent.amount);
    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      String(intent.currency || "MXN").toUpperCase() !== "MXN"
    ) {
      return NextResponse.json(
        { ok: false, error: "INTENT_AMOUNT_OR_CURRENCY_INVALID" },
        { status: 400 }
      );
    }

    const payment = await createPayment({
      amount,
      concept: folio,
      formData,
      payerEmail: session.user.email ?? null,
      notificationUrl: `${getPaymentSiteUrl()}/api/webhooks/mercadopago`,
    });

    if (!payment.ok || !payment.paymentId) {
      await supabaseAdmin
        .from("deposit_intents")
        .update({
          status: "failed",
          provider_payload: {
            preference_id: recordedPreferenceId || preferenceId || null,
            selected_payment_method: selectedPaymentMethod || null,
            error: payment.error || "PAYMENT_CREATE_FAILED",
          },
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", intent.id);

      return NextResponse.json(
        { ok: false, error: "PAYMENT_CREATE_FAILED" },
        { status: 400 }
      );
    }

    const providerAmount = roundMoney(payment.amount);
    if (Number.isFinite(providerAmount) && providerAmount !== amount) {
      console.error("Mercado Pago Checkout amount mismatch", {
        folio,
        expectedAmount: amount,
        providerAmount,
        paymentId: payment.paymentId,
      });
      return NextResponse.json(
        { ok: false, error: "PAYMENT_AMOUNT_MISMATCH" },
        { status: 422 }
      );
    }

    await fraudLog(supabaseAdmin as any, req, {
      userId: session.user.id,
      eventType: "mercadopago_checkout_api_payment_created",
      metadata: {
        folio,
        amount,
        payment_id: payment.paymentId,
        status: payment.status,
        preference_id: recordedPreferenceId || preferenceId || null,
        selected_payment_method: selectedPaymentMethod || null,
      },
    });

    const nextStatus = depositStatusFromPayment(payment.status);
    const providerPayload = {
      payment_id: payment.paymentId,
      preference_id: recordedPreferenceId || preferenceId || null,
      selected_payment_method: selectedPaymentMethod || null,
      status: payment.status,
      status_detail: payment.statusDetail,
      amount: providerAmount,
      currency: "MXN",
      redirect_url: payment.redirectUrl || null,
      source: "checkout_api",
      payment_policy: "mercadopago_only_v1",
    };

    if (nextStatus !== "credited") {
      const { error: updateError } = await supabaseAdmin
        .from("deposit_intents")
        .update({
          status: nextStatus,
          external_id: payment.paymentId,
          provider_payload: providerPayload,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", intent.id);

      if (updateError) {
        console.error("Mercado Pago pending intent update failed", updateError);
        return NextResponse.json(
          { ok: false, error: "INTENT_UPDATE_FAILED" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        status: payment.status,
        statusDetail: payment.statusDetail,
        paymentId: payment.paymentId,
        redirectUrl: payment.redirectUrl,
      });
    }

    const { data, error } = await supabaseAdmin.rpc(
      "credit_deposit_atomic",
      {
        p_intent_id: folio,
        p_provider: "mercadopago",
        p_external_id: payment.paymentId,
        p_user_id: session.user.id,
        p_amount: amount,
        p_currency: "MXN",
        p_provider_payload: providerPayload,
      }
    );

    if (error) {
      console.error("Mercado Pago Checkout atomic credit failed", error);
      return NextResponse.json(
        { ok: false, error: "ATOMIC_CREDIT_FAILED" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      status: payment.status,
      statusDetail: payment.statusDetail,
      paymentId: payment.paymentId,
      credited: Boolean((data as any)?.credited),
      idempotent: Boolean((data as any)?.idempotent),
    });
  } catch (error) {
    console.error("Mercado Pago Checkout process error", error);
    return NextResponse.json(
      { ok: false, error: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
