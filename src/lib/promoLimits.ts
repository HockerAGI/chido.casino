import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

const num = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

export type PromoLimitState =
  | { ok: true; hasRollover: false }
  | {
      ok: true;
      hasRollover: true;
      claimId: string;
      required: number;
      progress: number;
      maxBet: number;
      source: "env" | "casino_settings" | "default";
    }
  | { ok: false; error: string };

export async function getPromoLimitState(
  supabaseAdmin: SupabaseClient,
  userId: string
): Promise<PromoLimitState> {
  try {
    const uid = String(userId || "").trim();
    if (!uid) return { ok: false, error: "USER_REQUIRED" };

    const { data: claim, error: claimError } = await supabaseAdmin
      .from("promo_claims")
      .select("id,status,wagering_required,wagering_progress")
      .eq("user_id", uid)
      .eq("status", "applied")
      .order("claimed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (claimError) {
      return {
        ok: false,
        error: claimError.message || "PROMO_LIMIT_LOOKUP_FAILED",
      };
    }

    if (!claim) return { ok: true, hasRollover: false };

    const required = num(claim.wagering_required);
    const progress = num(claim.wagering_progress);

    if (required < 0 || progress < 0) {
      return { ok: false, error: "PROMO_ROLLOVER_STATE_INVALID" };
    }

    const stillRollover = required > 0 && progress < required;
    if (!stillRollover) return { ok: true, hasRollover: false };

    const envMax = num(process.env.PROMO_ACTIVE_MAX_BET_MXN);
    if (envMax > 0) {
      return {
        ok: true,
        hasRollover: true,
        claimId: String(claim.id),
        required,
        progress,
        maxBet: envMax,
        source: "env",
      };
    }

    const settings = await supabaseAdmin
      .from("casino_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (settings.error) {
      return {
        ok: false,
        error: settings.error.message || "CASINO_SETTINGS_LOOKUP_FAILED",
      };
    }

    let settingsMax = 0;
    if (settings.data) {
      const row = settings.data as Record<string, unknown>;
      settingsMax =
        num(row.promo_active_max_bet_mxn) ||
        num(row.promo_max_bet_mxn) ||
        num(row.promo_max_bet) ||
        num(row.max_bet_promo) ||
        0;
    }

    if (settingsMax > 0) {
      return {
        ok: true,
        hasRollover: true,
        claimId: String(claim.id),
        required,
        progress,
        maxBet: settingsMax,
        source: "casino_settings",
      };
    }

    return {
      ok: true,
      hasRollover: true,
      claimId: String(claim.id),
      required,
      progress,
      maxBet: 100,
      source: "default",
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "PROMO_LIMIT_ERROR",
    };
  }
}
