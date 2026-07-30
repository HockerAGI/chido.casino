import "server-only";

const STRIPE_BASE_URL = "https://api.stripe.com/v1";

function getSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY || "";
  if (!key) throw new Error("STRIPE_NOT_CONFIGURED: falta STRIPE_SECRET_KEY");
  return key;
}

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export type CreateStripeCheckoutSessionInput = {
  userId: string;
  userEmail: string | null;
  amount: number;
  concept: string;
  successUrl?: string;
  cancelUrl?: string;
};

export type CreateStripeCheckoutSessionResult = {
  ok: boolean;
  sessionId?: string;
  checkoutUrl?: string;
  error?: string;
};

export async function createStripeCheckoutSession(
  input: CreateStripeCheckoutSessionInput
): Promise<CreateStripeCheckoutSessionResult> {
  try {
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      return { ok: false, error: "Monto invalido" };
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://chido.casino";
    const amountCents = Math.round(input.amount * 100);
    const body = new URLSearchParams();

    body.set("mode", "payment");
    body.set("success_url", input.successUrl || `${siteUrl}/wallet?tab=deposit&status=success`);
    body.set("cancel_url", input.cancelUrl || `${siteUrl}/wallet?tab=deposit&status=cancelled`);
    body.set("client_reference_id", input.concept);
    body.set("line_items[0][quantity]", "1");
    body.set("line_items[0][price_data][currency]", "mxn");
    body.set("line_items[0][price_data][unit_amount]", String(amountCents));
    body.set("line_items[0][price_data][product_data][name]", "Deposito Chido Casino");
    body.set("metadata[provider]", "stripe");
    body.set("metadata[folio]", input.concept);
    body.set("metadata[user_id]", input.userId);
    body.set("payment_intent_data[metadata][provider]", "stripe");
    body.set("payment_intent_data[metadata][folio]", input.concept);
    body.set("payment_intent_data[metadata][user_id]", input.userId);

    if (input.userEmail) {
      body.set("customer_email", input.userEmail);
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${getSecretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": `chido-deposit-${input.concept}`,
    };

    if (process.env.STRIPE_API_VERSION) {
      headers["Stripe-Version"] = process.env.STRIPE_API_VERSION;
    }

    const res = await fetch(`${STRIPE_BASE_URL}/checkout/sessions`, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
    });

    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        error: data?.error?.message || data?.message || `Stripe error (${res.status})`,
      };
    }

    return {
      ok: true,
      sessionId: String(data.id || ""),
      checkoutUrl: data.url || undefined,
    };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Error al crear sesion de Stripe" };
  }
}
