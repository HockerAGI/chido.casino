import "server-only";

export type ChidoPaymentMode = "disabled" | "sandbox" | "production";
export type ChidoPaymentProvider = "mercadopago" | "stripe";

export type PaymentPolicyDecision = {
  allowed: boolean;
  status: number;
  code:
    | "PAYMENTS_DISABLED"
    | "SANDBOX_ONLY"
    | "SANDBOX_NOT_AUTHORIZED"
    | "SANDBOX_CREDENTIAL_REQUIRED"
    | "SANDBOX_PRODUCTION_DATA_FORBIDDEN"
    | "LICENSE_NOT_APPROVED"
    | "PROVIDER_APPROVAL_REQUIRED"
    | "KYC_AML_NOT_READY"
    | "PRODUCTION_CREDENTIAL_REQUIRED"
    | "PRODUCTION_DATA_ENV_REQUIRED"
    | "WEBHOOK_BASE_URL_REQUIRED"
    | "PROVIDER_NOT_ALLOWED"
    | "PAYMENTS_READY";
};

const DEFAULT_PRODUCTION_SUPABASE_REF = "yvuibbcuntqpyqiuqggd";

function enabled(name: string) {
  return ["1", "true", "yes", "on"].includes(
    String(process.env[name] || "").trim().toLowerCase()
  );
}

function paymentMode(): ChidoPaymentMode {
  const value = String(process.env.CHIDO_PAYMENT_MODE || "disabled")
    .trim()
    .toLowerCase();

  if (value === "sandbox" || value === "production") return value;
  return "disabled";
}

function isProductionEnvironment() {
  const vercelEnvironment = String(process.env.VERCEL_ENV || "").toLowerCase();
  if (vercelEnvironment) return vercelEnvironment === "production";
  return process.env.NODE_ENV === "production";
}

function currentSupabaseProjectRef() {
  const value = String(process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname.endsWith(".supabase.co")
      ? hostname.slice(0, -".supabase.co".length)
      : "";
  } catch {
    return "";
  }
}

function productionSupabaseProjectRef() {
  return String(
    process.env.CHIDO_PRODUCTION_SUPABASE_PROJECT_REF ||
      DEFAULT_PRODUCTION_SUPABASE_REF
  )
    .trim()
    .toLowerCase();
}

function mercadoPagoCredentialKind() {
  const token = String(process.env.MERCADOPAGO_ACCESS_TOKEN || "").trim();
  if (token.startsWith("TEST-")) return "sandbox" as const;
  if (token) return "production" as const;
  return "missing" as const;
}

export function getPaymentWebhookBaseUrl() {
  const candidate = String(
    process.env.CHIDO_PAYMENT_WEBHOOK_BASE_URL || ""
  ).trim();

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:") return null;
    if (parsed.username || parsed.password || parsed.search || parsed.hash) {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

export function getChidoPaymentPolicy() {
  const mode = paymentMode();
  const productionEnvironment = isProductionEnvironment();
  const licenseApproved = enabled("CHIDO_GAMBLING_LICENSE_APPROVED");
  const mercadoPagoApproved = enabled(
    "CHIDO_MERCADOPAGO_WRITTEN_APPROVAL"
  );
  const kycAmlReady = enabled("CHIDO_KYC_AML_READY");
  const sandboxAuthorized = enabled("CHIDO_PAYMENT_SANDBOX_AUTHORIZED");
  const supabaseProjectRef = currentSupabaseProjectRef();
  const expectedProductionSupabaseRef = productionSupabaseProjectRef();
  const usesProductionData =
    Boolean(supabaseProjectRef) &&
    supabaseProjectRef === expectedProductionSupabaseRef;
  const credentialKind = mercadoPagoCredentialKind();
  const webhookBaseUrl = getPaymentWebhookBaseUrl();

  return {
    mode,
    productionEnvironment,
    licenseApproved,
    mercadoPagoApproved,
    kycAmlReady,
    sandboxAuthorized,
    supabaseProjectRef,
    expectedProductionSupabaseRef,
    usesProductionData,
    credentialKind,
    webhookBaseUrl,
    stripeAllowed: false,
    mercadoPagoAllowed:
      mode === "sandbox"
        ? !productionEnvironment &&
          sandboxAuthorized &&
          credentialKind === "sandbox" &&
          Boolean(supabaseProjectRef) &&
          !usesProductionData &&
          Boolean(webhookBaseUrl)
        : mode === "production" &&
          productionEnvironment &&
          licenseApproved &&
          mercadoPagoApproved &&
          kycAmlReady &&
          credentialKind === "production" &&
          usesProductionData &&
          Boolean(webhookBaseUrl),
  } as const;
}

export function authorizeDepositProvider(
  provider: ChidoPaymentProvider
): PaymentPolicyDecision {
  const policy = getChidoPaymentPolicy();

  if (provider === "stripe") {
    return {
      allowed: false,
      status: 451,
      code: "PROVIDER_NOT_ALLOWED",
    };
  }

  if (policy.mode === "disabled") {
    return { allowed: false, status: 503, code: "PAYMENTS_DISABLED" };
  }

  if (policy.mode === "sandbox") {
    if (policy.productionEnvironment) {
      return { allowed: false, status: 503, code: "SANDBOX_ONLY" };
    }
    if (!policy.sandboxAuthorized) {
      return {
        allowed: false,
        status: 503,
        code: "SANDBOX_NOT_AUTHORIZED",
      };
    }
    if (policy.credentialKind !== "sandbox") {
      return {
        allowed: false,
        status: 503,
        code: "SANDBOX_CREDENTIAL_REQUIRED",
      };
    }
    if (!policy.supabaseProjectRef || policy.usesProductionData) {
      return {
        allowed: false,
        status: 503,
        code: "SANDBOX_PRODUCTION_DATA_FORBIDDEN",
      };
    }
    if (!policy.webhookBaseUrl) {
      return {
        allowed: false,
        status: 503,
        code: "WEBHOOK_BASE_URL_REQUIRED",
      };
    }
    return { allowed: true, status: 200, code: "PAYMENTS_READY" };
  }

  if (!policy.productionEnvironment) {
    return { allowed: false, status: 503, code: "SANDBOX_ONLY" };
  }
  if (!policy.licenseApproved) {
    return {
      allowed: false,
      status: 503,
      code: "LICENSE_NOT_APPROVED",
    };
  }
  if (!policy.mercadoPagoApproved) {
    return {
      allowed: false,
      status: 503,
      code: "PROVIDER_APPROVAL_REQUIRED",
    };
  }
  if (!policy.kycAmlReady) {
    return {
      allowed: false,
      status: 503,
      code: "KYC_AML_NOT_READY",
    };
  }
  if (policy.credentialKind !== "production") {
    return {
      allowed: false,
      status: 503,
      code: "PRODUCTION_CREDENTIAL_REQUIRED",
    };
  }
  if (!policy.usesProductionData) {
    return {
      allowed: false,
      status: 503,
      code: "PRODUCTION_DATA_ENV_REQUIRED",
    };
  }
  if (!policy.webhookBaseUrl) {
    return {
      allowed: false,
      status: 503,
      code: "WEBHOOK_BASE_URL_REQUIRED",
    };
  }

  return { allowed: true, status: 200, code: "PAYMENTS_READY" };
}
