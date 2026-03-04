import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

const num = (v: any) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

function isMissingTable(msg: string) {
  const m = (msg || "").toLowerCase();
  return m.includes("relation") && m.includes("does not exist");
}

export type PromoLimitState =
  | { ok: true; hasRollover: false }
  | {
      ok: true;
      hasRollover: true;
      claimId: string;
      required: number;
      progress: number;
      maxBet: number; // MXN
      source: "env" | "casino_settings" | "default";
    }
  | { ok: false; error: string };

/**
 * Regla PRO:
 * - Solo aplica cap si hay promo CLAIM en status "applied" con wagering_required > wagering_progress.
 * - Max bet se toma de:
 *    1) ENV PROMO_ACTIVE_MAX_BET_MXN
 *    2) casino_settings (best-effort por keys)
 *    3) default conservador: 100 MXN
 */
export async function getPromoLimitState(
  supabaseAdmin: SupabaseClient,
  userId: string
): Promise<PromoLimitState> {
  try {
    const uid = String(userId || "").trim();
    if (!uid) return { ok: true, hasRollover: false };

    const { data: claim, error: cErr } = await supabaseAdmin
      .from("promo_claims")
      .select("id,status,wagering_required,wagering_progress")
      .eq("user_id", uid)
      .eq("status", "applied")
      .order("claimed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cErr) {
      if (isMissingTable(String(cErr.message || ""))) return { ok: true, hasRollover: false };
      return { ok: false, error: cErr.message };
    }

    if (!claim) return { ok: true, hasRollover: false };

    const required = num((claim as any).wagering_required);
    const progress = num((claim as any).wagering_progress);

    const stillRollover = required > 0 && progress < required;
    if (!stillRollover) return { ok: true, hasRollover: false };

    // 1) ENV first
    const envMax = num(process.env.PROMO_ACTIVE_MAX_BET_MXN);
    if (envMax > 0) {
      return {
        ok: true,
        hasRollover: true,
        claimId: String((claim as any).id),
        required,
        progress,
        maxBet: envMax,
        source: "env",
      };
    }

    // 2) casino_settings best-effort (sin romper si faltan columnas)
    let settingsMax = 0;
    const s = await supabaseAdmin.from("casino_settings").select("*").eq("id", 1).maybeSingle();
    if (!s.error && s.data) {
      const row: any = s.data;
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
        claimId: String((claim as any).id),
        required,
        progress,
        maxBet: settingsMax,
        source: "casino_settings",
      };
    }

    // 3) default conservador (implementado, no “supuesto”)
    return {
      ok: true,
      hasRollover: true,
      claimId: String((claim as any).id),
      required,
      progress,
      maxBet: 100,
      source: "default",
    };
  } catch (e: any) {
    return { ok: false, error: e?.message || "PROMO_LIMIT_ERROR" };
  }
}