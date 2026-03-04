import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { walletApplyDelta } from "@/lib/walletApplyDelta";

type PromoProgressResult =
  | { ok: true; status: "none" | "skipped" | "progressed" | "completed"; claimId?: string; required?: number; progress?: number }
  | { ok: false; status: "error"; error: string };

const num = (v: any) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

export async function promoWageringProgress(
  supabaseAdmin: SupabaseClient,
  params: {
    userId: string;
    wagerAmount: number;          // cuánto apostó el usuario
    wagerRef: string;             // idempotencia best-effort
    game?: "crash" | "taco_slot" | string;
  }
): Promise<PromoProgressResult> {
  const userId = String(params.userId || "").trim();
  const wagerAmount = num(params.wagerAmount);
  const wagerRef = String(params.wagerRef || "").trim();

  if (!userId || !wagerRef || wagerAmount <= 0) {
    return { ok: true, status: "skipped" };
  }

  // 1) Claim aplicado (en rollover)
  const { data: claim, error: cErr } = await supabaseAdmin
    .from("promo_claims")
    .select("id,status,wagering_required,wagering_progress,metadata")
    .eq("user_id", userId)
    .eq("status", "applied")
    .order("claimed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cErr) return { ok: false, status: "error", error: cErr.message };
  if (!claim) return { ok: true, status: "none" };

  const required = num((claim as any).wagering_required);
  const progress = num((claim as any).wagering_progress);
  if (required <= 0) return { ok: true, status: "none", claimId: claim.id, required, progress };

  const meta = ((claim as any).metadata || {}) as any;

  // Idempotencia best-effort (evita duplicar por retries)
  if (meta?.last_wager_ref && String(meta.last_wager_ref) === wagerRef) {
    return { ok: true, status: "skipped", claimId: claim.id, required, progress };
  }

  const next = Math.min(required, progress + wagerAmount);

  const up = await supabaseAdmin
    .from("promo_claims")
    .update({
      wagering_progress: next,
      metadata: {
        ...meta,
        last_wager_ref: wagerRef,
        last_game: params.game || null,
        last_wager_amount: wagerAmount,
        last_wager_at: new Date().toISOString(),
      },
    })
    .eq("id", claim.id);

  if (up.error) return { ok: false, status: "error", error: up.error.message };

  // 2) Si completó: marcar completed + convertir bonus_balance → balance (para que sea “real”)
  if (next >= required) {
    // saldo bonus actual
    const b = await supabaseAdmin
      .from("balances")
      .select("bonus_balance")
      .eq("user_id", userId)
      .maybeSingle();

    const bonusNow = num((b.data as any)?.bonus_balance);

    // Cambiar status primero (auditable)
    const meta2 = {
      ...(meta || {}),
      completed_at: new Date().toISOString(),
      completed_by: "auto",
    };

    const up2 = await supabaseAdmin
      .from("promo_claims")
      .update({ status: "completed", metadata: meta2 })
      .eq("id", claim.id);

    if (up2.error) return { ok: false, status: "error", error: up2.error.message };

    // Convertir bonus a balance (si existe)
    if (bonusNow > 0) {
      const ref = `promo_clear:${claim.id}:${wagerRef}`;
      const conv = await walletApplyDelta(supabaseAdmin as any, {
        userId,
        deltaBalance: +bonusNow,
        deltaBonus: -bonusNow,
        deltaLocked: 0,
        reason: "promo_clear_bonus",
        refId: ref,
      });
      if (conv.error) {
        // no rompemos: claim ya quedó completed, pero reportamos error
        return { ok: false, status: "error", error: String(conv.error) };
      }
    }

    return { ok: true, status: "completed", claimId: claim.id, required, progress: next };
  }

  return { ok: true, status: "progressed", claimId: claim.id, required, progress: next };
}