import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { walletApplyDelta } from "@/lib/walletApplyDelta";

type PromoProgressResult =
  | {
      ok: true;
      status: "none" | "skipped" | "progressed" | "completed";
      claimId?: string;
      required?: number;
      progress?: number;
    }
  | { ok: false; status: "error"; error: string };

type AffiliateWageringResult =
  | { ok: true; status: "none" | "processed" }
  | { ok: false; error: string };

const num = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

async function processAffiliateWagering(
  supabaseAdmin: SupabaseClient,
  params: {
    userId: string;
    wagerAmount: number;
    wagerRef: string;
    game?: string;
  }
): Promise<AffiliateWageringResult> {
  const { userId, wagerAmount, wagerRef, game } = params;

  const { data: referral, error: refErr } = await supabaseAdmin
    .from("affiliate_referrals")
    .select("affiliate_user_id, affiliates(status)")
    .eq("referred_user_id", userId)
    .maybeSingle();

  if (refErr) {
    return { ok: false, error: refErr.message };
  }

  if (!referral || (referral.affiliates as any)?.status !== "active") {
    return { ok: true, status: "none" };
  }

  const commissionRate = Number.parseFloat(
    process.env.AFFILIATE_COMMISSION_RATE || "0.005"
  );
  const safeRate = Number.isFinite(commissionRate)
    ? Math.max(0, Math.min(commissionRate, 1))
    : 0.005;
  const commissionAmount = Math.round(wagerAmount * safeRate * 100) / 100;

  if (commissionAmount <= 0) {
    return { ok: true, status: "none" };
  }

  const { error: rpcError } = await supabaseAdmin.rpc(
    "_distribute_affiliate_commission",
    {
      p_affiliate_user_id: referral.affiliate_user_id,
      p_referred_user_id: userId,
      p_wager_amount: wagerAmount,
      p_commission_amount: commissionAmount,
      p_wager_ref: wagerRef,
      p_game: game ?? null,
    }
  );

  if (rpcError && rpcError.code !== "23505") {
    return { ok: false, error: rpcError.message };
  }

  return { ok: true, status: "processed" };
}

export async function promoWageringProgress(
  supabaseAdmin: SupabaseClient,
  params: {
    userId: string;
    wagerAmount: number;
    wagerRef: string;
    game?: "crash" | "taco_slot" | string;
  }
): Promise<PromoProgressResult> {
  const userId = String(params.userId || "").trim();
  const wagerAmount = num(params.wagerAmount);
  const wagerRef = String(params.wagerRef || "").trim();

  if (!userId || !wagerRef || wagerAmount <= 0) {
    return { ok: true, status: "skipped" };
  }

  const affiliateResult = await processAffiliateWagering(
    supabaseAdmin,
    params
  );
  if (!affiliateResult.ok) {
    console.error(
      `[AffiliateWagering] Error for user ${userId}, ref ${wagerRef}:`,
      affiliateResult.error
    );
  }

  const { data: claim, error: claimError } = await supabaseAdmin
    .from("promo_claims")
    .select("id,status,wagering_required,wagering_progress,metadata")
    .eq("user_id", userId)
    .eq("status", "applied")
    .order("claimed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (claimError) {
    return { ok: false, status: "error", error: claimError.message };
  }
  if (!claim) return { ok: true, status: "none" };

  const required = num((claim as any).wagering_required);
  const progress = num((claim as any).wagering_progress);
  if (required <= 0) {
    return {
      ok: true,
      status: "none",
      claimId: claim.id,
      required,
      progress,
    };
  }

  const metadata = ((claim as any).metadata || {}) as Record<string, unknown>;
  if (String(metadata.last_wager_ref || "") === wagerRef) {
    return {
      ok: true,
      status: "skipped",
      claimId: claim.id,
      required,
      progress,
    };
  }

  const nextProgress = Math.min(required, progress + wagerAmount);
  const { error: updateError } = await supabaseAdmin
    .from("promo_claims")
    .update({
      wagering_progress: nextProgress,
      metadata: {
        ...metadata,
        last_wager_ref: wagerRef,
        last_game: params.game || null,
        last_wager_amount: wagerAmount,
        last_wager_at: new Date().toISOString(),
      },
    })
    .eq("id", claim.id)
    .eq("wagering_progress", progress);

  if (updateError) {
    return { ok: false, status: "error", error: updateError.message };
  }

  if (nextProgress < required) {
    return {
      ok: true,
      status: "progressed",
      claimId: claim.id,
      required,
      progress: nextProgress,
    };
  }

  const { data: balanceRow, error: balanceError } = await supabaseAdmin
    .from("balances")
    .select("bonus_balance")
    .eq("user_id", userId)
    .maybeSingle();

  if (balanceError) {
    return { ok: false, status: "error", error: balanceError.message };
  }

  const bonusNow = num((balanceRow as any)?.bonus_balance);
  if (bonusNow > 0) {
    const conversion = await walletApplyDelta(supabaseAdmin as any, {
      userId,
      deltaBalance: bonusNow,
      deltaBonus: -bonusNow,
      deltaLocked: 0,
      reason: "promo_clear_bonus",
      refId: `promo_clear:${claim.id}:${wagerRef}`,
      metadata: { claim_id: claim.id, wager_ref: wagerRef },
    });

    if (conversion.error) {
      return {
        ok: false,
        status: "error",
        error: String(conversion.error),
      };
    }
  }

  const { error: completeError } = await supabaseAdmin
    .from("promo_claims")
    .update({
      status: "completed",
      metadata: {
        ...metadata,
        completed_at: new Date().toISOString(),
        completed_by: "auto",
        last_wager_ref: wagerRef,
        last_game: params.game || null,
        last_wager_amount: wagerAmount,
      },
    })
    .eq("id", claim.id);

  if (completeError) {
    return { ok: false, status: "error", error: completeError.message };
  }

  return {
    ok: true,
    status: "completed",
    claimId: claim.id,
    required,
    progress: nextProgress,
  };
}
