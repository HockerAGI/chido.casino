import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SelfExclusionState =
  | { ok: true; excluded: false }
  | { ok: true; excluded: true; until: string; reason?: string | null }
  | { ok: false; error: string };

export async function getSelfExclusionState(
  supabaseAdmin: SupabaseClient,
  userId: string
): Promise<SelfExclusionState> {
  try {
    const uid = String(userId || "").trim();
    if (!uid) return { ok: false, error: "USER_REQUIRED" };

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("self_excluded_until,self_excluded_reason")
      .eq("user_id", uid)
      .maybeSingle();

    if (error) {
      return {
        ok: false,
        error: error.message || "SELF_EXCLUSION_LOOKUP_FAILED",
      };
    }
    if (!data) {
      return { ok: false, error: "PROFILE_NOT_FOUND" };
    }

    const until = data.self_excluded_until
      ? String(data.self_excluded_until)
      : "";
    if (!until) return { ok: true, excluded: false };

    const untilMs = Date.parse(until);
    if (!Number.isFinite(untilMs)) {
      return { ok: false, error: "SELF_EXCLUSION_DATE_INVALID" };
    }

    if (Date.now() < untilMs) {
      return {
        ok: true,
        excluded: true,
        until,
        reason: data.self_excluded_reason ?? null,
      };
    }

    return { ok: true, excluded: false };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "SELF_EXCLUSION_ERROR",
    };
  }
}
