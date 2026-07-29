import "server-only";

import crypto from "crypto";

const MP_BASE_URL = "https://api.mercadopago.com";

function getAccessToken(): string {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN || "";
  if (!token) throw new Error("MERCADOPAGO_NOT_CONFIGURED: falta MERCADOPAGO_ACCESS_TOKEN");
  return token;
}

export function isMercadoPagoConfigured(): boolean {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);
}

export type CreatePreferenceInput = {
  userId: string;
  userEmail: string | null;
  amount: number;
  concept: string;
  notificationUrl?: string;
  backUrl?: string;
};

export type CreatePreferenceResult = {
  ok: boolean;
  preferenceId?: string;
  initPoint?: string;
  sandboxInitPoint?: string;
  error?: string;
};

export async function createCheckoutPreference(
  input: CreatePreferenceInput
): Promise<CreatePreferenceResult> {
  try {
    const { userEmail, amount, concept, notificationUrl, backUrl } = input;

    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, error: "Monto invalido" };
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://chido.casino";
    const body: any = {
      items: [
        {
          id: concept,
          title: `Deposito Chido Casino - Folio ${concept}`,
          description: "Deposito a tu cuenta de Chido Casino",
          quantity: 1,
          currency_id: "MXN",
          unit_price: Math.round(amount * 100) / 100,
        },
      ],
      payer: { email: userEmail || undefined },
      external_reference: concept,
      payment_methods: {
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

    if (notificationUrl) body.notification_url = notificationUrl;

    const res = await fetch(`${MP_BASE_URL}/checkout/preferences`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getAccessToken()}`,
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
  status?: string;
  statusDetail?: string;
  amount?: number;
  currency?: string;
  externalReference?: string;
  paymentMethod?: string;
  payerEmail?: string;
  error?: string;
};

export async function getPayment(paymentId: string | number): Promise<GetPaymentResult> {
  try {
    const res = await fetch(`${MP_BASE_URL}/v1/payments/${paymentId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${getAccessToken()}`,
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
  amount: number;
  clabe: string;
  beneficiary: string;
  concept: string;
};

export type CreatePayoutResult = {
  ok: boolean;
  payoutId?: string;
  status?: string;
  error?: string;
};

export async function createPayout(input: CreatePayoutInput): Promise<CreatePayoutResult> {
  try {
    const { amount, clabe, beneficiary, concept } = input;

    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, error: "Monto invalido para retiro" };
    }
    if (!/^[0-9]{18}$/.test(clabe)) {
      return { ok: false, error: "CLABE invalida (debe tener 18 digitos)" };
    }
    if (beneficiary.trim().length < 3) {
      return { ok: false, error: "Nombre del beneficiario invalido" };
    }

    const body: any = {
      external_reference: concept,
      transaction_amount: Math.round(amount * 100) / 100,
      currency_id: "MXN",
      description: `Retiro Chido Casino - Folio ${concept}`,
      payer: { email: "pagos@chido.casino" },
      receiver: {
        bank_account: {
          type: "checking_account",
          number: clabe,
          holder: { name: beneficiary },
        },
      },
    };

    const res = await fetch(`${MP_BASE_URL}/payouts/v1/transfers`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getAccessToken()}`,
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

export function verifyWebhookSignature(
  signatureHeader: string | null,
  xRequestId: string | null,
  dataId: string | number | null | undefined
): { enforced: boolean; ok: boolean } {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET || "";
  const requireSignature = process.env.MERCADOPAGO_REQUIRE_WEBHOOK_SIGNATURE === "1";

  if (!secret) return { enforced: requireSignature, ok: !requireSignature };
  if (!signatureHeader || !xRequestId || !dataId) return { enforced: true, ok: false };

  try {
    let ts = "";
    let v1 = "";
    for (const part of signatureHeader.split(",")) {
      const [key, val] = part.trim().split("=");
      if (key === "ts") ts = val || "";
      if (key === "v1") v1 = val || "";
    }

    if (!ts || !v1) return { enforced: true, ok: false };

    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
    const a = Buffer.from(v1, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return { enforced: true, ok: false };

    return { enforced: true, ok: crypto.timingSafeEqual(a, b) };
  } catch {
    return { enforced: true, ok: false };
  }
}
