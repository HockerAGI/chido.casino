import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

function isSchemaMismatch(msg: string) {
  const m = (msg || "").toLowerCase();
  return m.includes("column") || m.includes("does not exist") || m.includes("unknown");
}

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
    if (!uid) return { ok: true, excluded: false };

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("self_excluded_until,self_excluded_reason")
      .eq("user_id", uid)
      .maybeSingle();

    if (error) {
      // Si no ejecutaron el SQL, no rompemos el sistema: tratamos como “no excluido”
      if (isSchemaMismatch(String(error.message || ""))) return { ok: true, excluded: false };
      return { ok: false, error: error.message };
    }

    const until = data?.self_excluded_until ? String(data.self_excluded_until) : "";
    if (!until) return { ok: true, excluded: false };

    const untilMs = Date.parse(until);
    if (!Number.isFinite(untilMs)) return { ok: true, excluded: false };

    if (Date.now() < untilMs) {
      return { ok: true, excluded: true, until, reason: data?.self_excluded_reason ?? null };
    }

    return { ok: true, excluded: false };
  } catch (e: any) {
    return { ok: false, error: e?.message || "SELF_EXCLUSION_ERROR" };
  }
}