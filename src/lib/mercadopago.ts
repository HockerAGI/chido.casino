import "server-only";

/**
 * Mercado Pago Integration for Chido Casino
 *
 * Handles:
 * - Deposits: Creates checkout preferences for card/SPEI/OXXO payments
 * - Withdrawals: Creates payouts to CLABE bank accounts (Mexican bank transfers)
 * - Webhook verification: Validates IPN/webhook notifications
 *
 * Uses the Mercado Pago API v1 (https://api.mercadopago.com)
 *
 * Environment variables needed:
 * - MERCADOPAGO_ACCESS_TOKEN  (APP_USR-... production token)
 * - MERCADOPAGO_PUBLIC_KEY    (APP_USR-... public key for frontend)
 * - NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY (exposed to client for SDK)
 * - MERCADOPAGO_WEBHOOK_SECRET (optional: for webhook signature verification)
 */

const MP_BASE_URL = "https://api.mercadopago.com";

function getAccessToken(): string {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN || "";
  if (!token) throw new Error("MERCADOPAGO_NOT_CONFIGURED: falta MERCADOPAGO_ACCESS_TOKEN");
  return token;
}

function getPublicKey(): string {
  return process.env.MERCADOPAGO_PUBLIC_KEY || process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || "";
}

export function isMercadoPagoConfigured(): boolean {
  return Boolean(getAccessToken());
}

export type MPCurrency = "MXN";

export type MPPaymentMethod = "card" | "spei" | "oxxo" | "atm";

export type CreatePreferenceInput = {
  userId: string;
  userEmail: string | null;
  amount: number; // in MXN
  concept: string; // folio / reference
  notificationUrl?: string;
  backUrl?: string;
};

export type CreatePreferenceResult = {
  ok: boolean;
  preferenceId?: string;
  initPoint?: string; // production checkout URL
  sandboxInitPoint?: string; // sandbox checkout URL
  error?: string;
};

/**
 * Create a Mercado Pago checkout preference for deposits.
 * This generates a hosted checkout page where the user pays with card, SPEI, or OXXO.
 */
export async function createCheckoutPreference(
  input: CreatePreferenceInput
): Promise<CreatePreferenceResult> {
  try {
    const accessToken = getAccessToken();
    const { userId, userEmail, amount, concept, notificationUrl, backUrl } = input;

    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, error: "Monto inválido" };
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://chido.casino";

    const body: any = {
      items: [
        {
          id: concept,
          title: `Depósito Chido Casino — Folio ${concept}`,
          description: "Depósito a tu cuenta de Chido Casino",
          quantity: 1,
          currency_id: "MXN",
          unit_price: Math.round(amount * 100) / 100,
        },
      ],
      payer: {
        email: userEmail || undefined,
      },
      external_reference: concept,
      // Allow all Mexican payment methods
      payment_methods: {
        // Let Mercado Pago decide which methods to show based on the amount
        // (card is always available; SPEI for bank transfer; OXXO for cash)
        installments: 1,
        default_installments: 1,
      },
      back_urls: {
        success: backUrl || `${siteUrl}/wallet?tab=deposit&status=success`,
        pending: backUrl || `${siteUrl}/wallet?tab=deposit&status=pending`,
        failure: backUrl || `${siteUrl}/wallet?tab=deposit&status=failure`,
      },
      auto_return: "approved",
      statement_descriptor: "CHIDO CASINO",
    };

    if (notificationUrl) {
      body.notification_url = notificationUrl;
    }

    const res = await fetch(`${MP_BASE_URL}/checkout/preferences`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `chido-deposit-${concept}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data: any = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = data?.message || data?.error || `Mercado Pago error (${res.status})`;
      console.error("Mercado Pago createPreference error:", data);
      return { ok: false, error: msg };
    }

    return {
      ok: true,
      preferenceId: data.id,
      initPoint: data.init_point,
      sandboxInitPoint: data.sandbox_init_point,
    };
  } catch (e: any) {
    const msg = e?.message || "Error al crear preferencia de Mercado Pago";
    console.error("Mercado Pago createPreference exception:", e);
    return { ok: false, error: msg };
  }
}

export type GetPaymentResult = {
  ok: boolean;
  paymentId?: string;
  status?: string; // approved | pending | rejected | in_process | cancelled
  statusDetail?: string;
  amount?: number;
  currency?: string;
  externalReference?: string;
  paymentMethod?: string;
  payerEmail?: string;
  error?: string;
};

/**
 * Get payment details by payment ID from Mercado Pago.
 * Used by the webhook handler to verify the payment status.
 */
export async function getPayment(paymentId: string | number): Promise<GetPaymentResult> {
  try {
    const accessToken = getAccessToken();

    const res = await fetch(`${MP_BASE_URL}/v1/payments/${paymentId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const data: any = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = data?.message || data?.error || `Mercado Pago error (${res.status})`;
      return { ok: false, error: msg };
    }

    return {
      ok: true,
      paymentId: String(data.id),
      status: data.status,
      statusDetail: data.status_detail,
      amount: Number(data.transaction_amount ?? 0),
      currency: data.currency_id,
      externalReference: data.external_reference,
      paymentMethod: data.payment_method_id,
      payerEmail: data.payer?.email,
    };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Error al obtener pago de Mercado Pago" };
  }
}

export type CreatePayoutInput = {
  userId: string;
  amount: number; // in MXN
  clabe: string; // 18-digit CLABE
  beneficiary: string; // account holder name
  concept: string; // withdrawal reference/folio
  bankCode?: string; // optional bank code
};

export type CreatePayoutResult = {
  ok: boolean;
  payoutId?: string;
  status?: string;
  error?: string;
};

/**
 * Create a payout (withdrawal) via Mercado Pago.
 *
 * NOTE: Mercado Pago's Payouts API (payouts/v1/transfers) requires a specific
 * integration with a Mercado Pago account that has payouts enabled.
 * For Mexican bank transfers, the CLABE is used as the destination.
 *
 * This uses the /payouts/v1/transfers endpoint which creates a bank transfer
 * to the specified CLABE account.
 */
export async function createPayout(input: CreatePayoutInput): Promise<CreatePayoutResult> {
  try {
    const accessToken = getAccessToken();
    const { amount, clabe, beneficiary, concept } = input;

    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, error: "Monto inválido para retiro" };
    }
    if (!/^[0-9]{18}$/.test(clabe)) {
      return { ok: false, error: "CLABE inválida (debe tener 18 dígitos)" };
    }
    if (beneficiary.trim().length < 3) {
      return { ok: false, error: "Nombre del beneficiario inválido" };
    }

    // Mercado Pago Payouts API for bank transfers (CLABE-based)
    // The transfer goes to the specified CLABE using SPEI
    const body: any = {
      external_reference: concept,
      transaction_amount: Math.round(amount * 100) / 100,
      currency_id: "MXN",
      description: `Retiro Chido Casino — Folio ${concept}`,
      payer: {
        email: "pagos@chido.casino",
      },
      // For Mexican bank transfers via SPEI, we use the receiver_data with CLABE
      receiver: {
        bank_account: {
          type: "checking_account",
          number: clabe,
          holder: {
            name: beneficiary,
          },
        },
      },
    };

    const res = await fetch(`${MP_BASE_URL}/payouts/v1/transfers`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `chido-withdraw-${concept}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data: any = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = data?.message || data?.error || data?.cause || `Mercado Pago payout error (${res.status})`;
      console.error("Mercado Pago payout error:", data);
      return { ok: false, error: msg };
    }

    return {
      ok: true,
      payoutId: String(data.id || data.transfer_id || ""),
      status: data.status || "processing",
    };
  } catch (e: any) {
    const msg = e?.message || "Error al crear retiro en Mercado Pago";
    console.error("Mercado Pago payout exception:", e);
    return { ok: false, error: msg };
  }
}

/**
 * Verify a Mercado Pago webhook/IPN notification.
 *
 * Mercado Pago sends either:
 * - x-signature header: base64(HMAC-SHA256(secret, "id:topic"))
 * - Or a simple GET with payment_id and topic parameters
 *
 * For production, we verify the x-signature header using the webhook secret.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  xRequestId: string | null
): { enforced: boolean; ok: boolean } {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET || "";

  // If no secret is configured, we don't enforce signature verification
  // (the payment status is still verified via the API in the handler)
  if (!secret) return { enforced: false, ok: true };

  if (!signatureHeader) return { enforced: true, ok: false };

  try {
    // Mercado Pago x-signature format: "ts=...,v1=..."
    const parts = signatureHeader.split(",");
    let ts = "";
    let v1 = "";
    for (const part of parts) {
      const [key, val] = part.trim().split("=");
      if (key === "ts") ts = val;
      if (key === "v1") v1 = val;
    }

    if (!ts || !v1) return { enforced: true, ok: false };

    // Build the manifest string: "id:topic" or "data.id:x-request-id:ts"
    const manifest = xRequestId ? `${xRequestId}:${ts}` : ts;
    const crypto = require("crypto");
    const expected = crypto
      .createHmac("sha256", secret)
      .update(manifest)
      .digest("hex");

    // Timing-safe comparison
    const a = Buffer.from(v1);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return { enforced: true, ok: false };
    return { enforced: true, ok: crypto.timingSafeEqual(a, b) };
  } catch {
    return { enforced: true, ok: false };
  }
}
