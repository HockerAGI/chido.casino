export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSession } from "@/lib/session";
import { fraudLog } from "@/lib/fraud";
import { creditAffiliateFirstDepositBonus } from "@/lib/depositBonuses";
import { createPayment, isMercadoPagoConfigured } from "@/lib/mercadopago";
import { walletApplyDelta } from "@/lib/walletApplyDelta";

const DEFAULT_SITE_URL = "https://chidocasino.vercel.app";

function isDuplicate(msg: string) {
  const m = (msg || "").toLowerCase();
  return m.includes("duplicate") || m.includes("unique") || m.includes("23505");
}

function depositStatusFromPayment(status?: string) {
  const s = String(status || "").toLowerCase();
  if (s === "approved") return "credited";
  if (["rejected", "cancelled", "canceled", "failure"].includes(s)) return "failed";
  return "pending";
}

function normalizeFolio(value: unknown) {
  const folio = String(value || "").trim();
  return /^CHDMP-[A-Z0-9]{6}-[0-9]{5}$/.test(folio) ? folio : "";
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(req);
    if (!session) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    if (!isMercadoPagoConfigured()) {
      return NextResponse.json({ ok: false, error: "Mercado Pago no esta configurado." }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const folio = normalizeFolio(body?.folio);
    const preferenceId = String(body?.preferenceId || "").trim();
    const formData = body?.formData && typeof body.formData === "object" ? body.formData : null;
    const selectedPaymentMethod = String(body?.selectedPaymentMethod || "").trim();

    if (!folio || !formData) {
      return NextResponse.json({ ok: false, error: "PAYMENT_DATA_REQUIRED" }, { status: 400 });
    }

    const { data: intent, error: intentErr } = await supabaseAdmin
      .from("deposit_intents")
      .select("*")
      .eq("intent_id", folio)
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (intentErr) {
      console.error("Mercado Pago Checkout API intent lookup error:", intentErr);
      return NextResponse.json({ ok: false, error: "INTENT_LOOKUP_FAILED" }, { status: 500 });
    }
    if (!intent || String(intent.provider || "") !== "mercadopago") {
      return NextResponse.json({ ok: false, error: "INTENT_NOT_FOUND" }, { status: 404 });
    }
    if (intent.status === "credited") {
      return NextResponse.json({ ok: true, status: "approved", alreadyCredited: true });
    }

    const recordedPreferenceId = String(intent.external_id || intent.metadata?.preference_id || "");
    if (preferenceId && recordedPreferenceId && preferenceId !== recordedPreferenceId) {
      return NextResponse.json({ ok: false, error: "PREFERENCE_MISMATCH" }, { status: 400 });
    }

    const amount = Number(intent.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ ok: false, error: "INTENT_AMOUNT_INVALID" }, { status: 400 });
    }

    const payment = await createPayment({
      amount,
      concept: folio,
      formData,
      payerEmail: session.user.email ?? null,
      notificationUrl: `${DEFAULT_SITE_URL}/api/webhooks/mercadopago`,
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
        } as any)
        .eq("id", intent.id);

      return NextResponse.json(
        { ok: false, error: payment.error || "PAYMENT_CREATE_FAILED" },
        { status: 400 }
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
    if (nextStatus !== "credited") {
      const { error: updateErr } = await supabaseAdmin
        .from("deposit_intents")
        .update({
          status: nextStatus,
          external_id: payment.paymentId,
          provider_payload: {
            payment_id: payment.paymentId,
            preference_id: recordedPreferenceId || preferenceId || null,
            selected_payment_method: selectedPaymentMethod || null,
            status: payment.status,
            status_detail: payment.statusDetail,
            amount: payment.amount,
            redirect_url: payment.redirectUrl || null,
          },
        } as any)
        .eq("id", intent.id);

      if (updateErr) {
        console.error("Mercado Pago Checkout API pending intent update error:", updateErr);
        return NextResponse.json({ ok: false, error: "INTENT_UPDATE_FAILED" }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        status: payment.status,
        statusDetail: payment.statusDetail,
        paymentId: payment.paymentId,
        redirectUrl: payment.redirectUrl,
      });
    }

    const apply = await walletApplyDelta(supabaseAdmin, {
      userId: session.user.id,
      deltaBalance: amount,
      deltaBonus: 0,
      deltaLocked: 0,
      reason: "deposit_mercadopago",
      refId: `mp_deposit:${folio}`,
      metadata: {
        payment_id: payment.paymentId,
        intent_id: folio,
        method: payment.paymentMethod,
        source: "checkout_api",
      },
    });

    if (apply.error && !isDuplicate(String(apply.error))) {
      console.error("Mercado Pago Checkout API wallet credit error:", apply.error);
      return NextResponse.json({ ok: false, error: apply.error }, { status: 500 });
    }

    const { error: updateErr } = await supabaseAdmin
      .from("deposit_intents")
      .update({
        status: "credited",
        external_id: payment.paymentId,
        provider_payload: {
          payment_id: payment.paymentId,
          preference_id: recordedPreferenceId || preferenceId || null,
          selected_payment_method: selectedPaymentMethod || null,
          status: payment.status,
          status_detail: payment.statusDetail,
          amount,
          source: "checkout_api",
        },
      } as any)
      .eq("id", intent.id);

    if (updateErr) {
      console.error("Mercado Pago Checkout API credited intent update error:", updateErr);
      return NextResponse.json({ ok: false, error: "INTENT_UPDATE_FAILED" }, { status: 500 });
    }

    await creditAffiliateFirstDepositBonus(supabaseAdmin, { userId: session.user.id, amount, intentId: folio });

    return NextResponse.json({
      ok: true,
      status: payment.status,
      statusDetail: payment.statusDetail,
      paymentId: payment.paymentId,
      credited: true,
    });
  } catch (e: any) {
    console.error("Mercado Pago Checkout API process-payment error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Error interno" }, { status: 500 });
  }
}
