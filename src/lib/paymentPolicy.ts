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
    | "LICENSE_NOT_APPROVED"
    | "PROVIDER_APPROVAL_REQUIRED"
    | "KYC_AML_NOT_READY"
    | "PROVIDER_NOT_ALLOWED"
    | "PAYMENTS_READY";
};

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

export function getChidoPaymentPolicy() {
  const mode = paymentMode();
  const productionEnvironment = isProductionEnvironment();
  const licenseApproved = enabled("CHIDO_GAMBLING_LICENSE_APPROVED");
  const mercadoPagoApproved = enabled(
    "CHIDO_MERCADOPAGO_WRITTEN_APPROVAL"
  );
  const kycAmlReady = enabled("CHIDO_KYC_AML_READY");
  const sandboxAuthorized = enabled("CHIDO_PAYMENT_SANDBOX_AUTHORIZED");

  return {
    mode,
    productionEnvironment,
    licenseApproved,
    mercadoPagoApproved,
    kycAmlReady,
    sandboxAuthorized,
    stripeAllowed: false,
    mercadoPagoAllowed:
      mode === "sandbox"
        ? !productionEnvironment && sandboxAuthorized
        : mode === "production" &&
          productionEnvironment &&
          licenseApproved &&
          mercadoPagoApproved &&
          kycAmlReady,
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

  return { allowed: true, status: 200, code: "PAYMENTS_READY" };
}
