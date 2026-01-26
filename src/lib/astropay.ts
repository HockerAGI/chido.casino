import "server-only";
import crypto from "crypto";

export type AstroPayMethod = "spei" | "oxxo" | "card";

type CreatePaymentArgs = {
  amount: number;
  currency: "MXN";
  method: AstroPayMethod;
  externalId: string;
  userId: string;
  userEmail: string;
  returnUrl: string;
  webhookUrl: string;
  description?: string;
};

function baseUrl() {
  return (process.env.ASTROPAY_BASE_URL || "").replace(/\/$/, "");
}

export function isAstroPayConfigured() {
  try {
    if (!process.env.ASTROPAY_BASE_URL) return false;
    if (!process.env.ASTROPAY_LOGIN && !process.env.ASTROPAY_ADT_LOGIN) return false;
    if (!process.env.ASTROPAY_KEY && !process.env.ASTROPAY_ADT_KEY) return false;
    return true;
  } catch {
    return false;
  }
}

function getLogin() {
  return process.env.ASTROPAY_ADT_LOGIN || process.env.ASTROPAY_LOGIN || "";
}

function getKey() {
  return process.env.ASTROPAY_ADT_KEY || process.env.ASTROPAY_KEY || "";
}

/**
 * Crea pago real en AstroPay.
 * CERO inventos: devuelve lo que AstroPay entregue.
 */
export async function astroPayCreatePayment(args: CreatePaymentArgs) {
  if (!isAstroPayConfigured()) throw new Error("CONFIG_MISSING:ASTROPAY");

  const api = baseUrl();
  if (!api) throw new Error("CONFIG_MISSING:ASTROPAY_BASE_URL");

  const path = process.env.ASTROPAY_CREATE_PATH || "/merchant/v1/create_payment";
  const url = `${api}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "ADT-Login": getLogin(),
    "ADT-Key": getKey(),
  };

  const payload: any = {
    amount: Number(args.amount.toFixed(2)),
    currency: args.currency,
    country: "MX",
    method: args.method,
    description: args.description || "Chido Casino depósito",
    external_id: args.externalId,
    client: {
      id: args.userId,
      email: args.userEmail,
    },
    urls: {
      return_url: args.returnUrl,
      webhook_url: args.webhookUrl,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const msg = data?.message || data?.error || text || "AstroPay error";
    throw new Error(msg);
  }

  return data;
}

export function pickProviderReference(payload: any, fallback: string) {
  const candidates = [
    payload?.id,
    payload?.payment_id,
    payload?.transaction_id,
    payload?.reference,
    payload?.external_id,
    payload?.data?.id,
    payload?.data?.payment_id,
    payload?.data?.transaction_id,
    payload?.data?.reference,
  ].filter(Boolean);

  return candidates.length ? String(candidates[0]) : fallback;
}

/**
 * Valida firma SOLO si existe ASTROPAY_WEBHOOK_SECRET.
 * Si no existe, no bloquea (pero tampoco “finge”).
 */
export function verifyWebhookHmac(rawBody: string, signature: string | null) {
  const secret = process.env.ASTROPAY_WEBHOOK_SECRET;
  if (!secret) return { ok: true, enforced: false };

  if (!signature) return { ok: false, enforced: true };

  const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return { ok: false, enforced: true };
  return { ok: crypto.timingSafeEqual(a, b), enforced: true };
}