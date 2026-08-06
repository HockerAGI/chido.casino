import "server-only";

export type ChidoGameMode = "disabled" | "sandbox" | "production";

export type GamePolicyDecision = {
  allowed: boolean;
  status: number;
  code:
    | "GAMES_DISABLED"
    | "SANDBOX_ONLY"
    | "SANDBOX_NOT_AUTHORIZED"
    | "SANDBOX_PRODUCTION_DATA_FORBIDDEN"
    | "PRODUCTION_DATA_ENV_REQUIRED"
    | "LICENSE_NOT_APPROVED"
    | "KYC_AML_NOT_READY"
    | "GAMES_READY";
};

const DEFAULT_PRODUCTION_SUPABASE_REF = "yvuibbcuntqpyqiuqggd";

function enabled(name: string) {
  return ["1", "true", "yes", "on"].includes(
    String(process.env[name] || "").trim().toLowerCase()
  );
}

function gameMode(): ChidoGameMode {
  const value = String(process.env.CHIDO_GAME_MODE || "disabled")
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

export function getChidoGamePolicy() {
  const mode = gameMode();
  const productionEnvironment = isProductionEnvironment();
  const sandboxAuthorized = enabled("CHIDO_GAME_SANDBOX_AUTHORIZED");
  const licenseApproved = enabled("CHIDO_GAMBLING_LICENSE_APPROVED");
  const kycAmlReady = enabled("CHIDO_KYC_AML_READY");
  const supabaseProjectRef = currentSupabaseProjectRef();
  const expectedProductionSupabaseRef = productionSupabaseProjectRef();
  const usesProductionData =
    Boolean(supabaseProjectRef) &&
    supabaseProjectRef === expectedProductionSupabaseRef;

  return {
    mode,
    productionEnvironment,
    sandboxAuthorized,
    licenseApproved,
    kycAmlReady,
    supabaseProjectRef,
    expectedProductionSupabaseRef,
    usesProductionData,
    allowed:
      mode === "sandbox"
        ? !productionEnvironment &&
          sandboxAuthorized &&
          Boolean(supabaseProjectRef) &&
          !usesProductionData
        : mode === "production" &&
          productionEnvironment &&
          licenseApproved &&
          kycAmlReady &&
          usesProductionData,
  } as const;
}

export function authorizeGameWrite(): GamePolicyDecision {
  const policy = getChidoGamePolicy();

  if (policy.mode === "disabled") {
    return { allowed: false, status: 503, code: "GAMES_DISABLED" };
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
    if (!policy.supabaseProjectRef || policy.usesProductionData) {
      return {
        allowed: false,
        status: 503,
        code: "SANDBOX_PRODUCTION_DATA_FORBIDDEN",
      };
    }
    return { allowed: true, status: 200, code: "GAMES_READY" };
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
  if (!policy.kycAmlReady) {
    return {
      allowed: false,
      status: 503,
      code: "KYC_AML_NOT_READY",
    };
  }
  if (!policy.usesProductionData) {
    return {
      allowed: false,
      status: 503,
      code: "PRODUCTION_DATA_ENV_REQUIRED",
    };
  }

  return { allowed: true, status: 200, code: "GAMES_READY" };
}
