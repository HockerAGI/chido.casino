import type { SupabaseClient } from "@supabase/supabase-js";
import { walletApplyDelta } from "@/lib/walletApplyDelta";

type Result = {
  applied: boolean;
  claimId?: string;
  offerId?: string;
  offerSlug?: string;
  bonusAwarded: number;
  freeRoundsAwarded: number;
  wageringRequired: number;
};

const num = (v: any) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

export async function applyPromoForDeposit(
  supabaseAdmin: SupabaseClient,
  params: { userId: string; depositAmount: number; depositRef: string }
): Promise<Result> {
  const { userId, depositAmount, depositRef } = params;

  // 1) Claim activo (solo 1 a la vez)
  const { data: claim, error: claimErr } = await supabaseAdmin
    .from("promo_claims")
    .select(
      "id, offer_id, status, expires_at, offer:promo_offers(id, slug, title, min_deposit, bonus_percent, max_bonus, free_rounds, wagering_multiplier, ends_at)"
    )
    .eq("user_id", userId)
    .eq("status", "active")
    .order("claimed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (claimErr || !claim?.offer) {
    return { applied: false, bonusAwarded: 0, freeRoundsAwarded: 0, wageringRequired: 0 };
  }

  const offer = claim.offer as any;
  const minDeposit = num(offer.min_deposit);
  if (depositAmount < minDeposit) {
    return {
      applied: false,
      claimId: claim.id,
      offerId: offer.id,
      offerSlug: offer.slug,
      bonusAwarded: 0,
      freeRoundsAwarded: 0,
      wageringRequired: 0,
    };
  }

  // 2) Calcular bono
  const bonusPercent = num(offer.bonus_percent);
  const maxBonus = num(offer.max_bonus);

  let bonus = (depositAmount * bonusPercent) / 100;
  if (maxBonus > 0) bonus = Math.min(bonus, maxBonus);
  if (!Number.isFinite(bonus) || bonus < 0) bonus = 0;

  const freeRounds = Math.max(0, Math.trunc(num(offer.free_rounds)));

  // 3) Wagering requerido (para bono)
  let wagerMult = num(offer.wagering_multiplier);
  if (wagerMult <= 0) {
    const { data: settings } = await supabaseAdmin
      .from("casino_settings")
      .select("promo_bonus_wager_multiplier")
      .eq("id", 1)
      .maybeSingle();
    wagerMult = Math.max(1, num(settings?.promo_bonus_wager_multiplier));
  }

  const wageringRequired = bonus > 0 ? bonus * wagerMult : 0;

  // 4) Idempotencia por ref_id
  const refId = `promo:${claim.id}:deposit:${depositRef}`;

  // 5) Aplicar bono a bonus_balance
  if (bonus > 0) {
    try {
      await walletApplyDelta(supabaseAdmin, {
        userId,
        deltaBalance: 0,
        deltaBonus: bonus,
        deltaLocked: 0,
        reason: "promo_bonus",
        refId,
        metadata: {
          promo_claim_id: claim.id,
          promo_offer_id: offer.id,
          promo_slug: offer.slug,
          deposit_ref: depositRef,
          deposit_amount: depositAmount,
          wager_required: wageringRequired,
        },
      });
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (!msg.toLowerCase().includes("duplicate")) throw e;
    }
  }

  // 6) Free rounds
  if (freeRounds > 0) {
    await supabaseAdmin.from("free_round_entitlements").insert({
      user_id: userId,
      game: "crash",
      remaining: freeRounds,
      source: "promo",
      expires_at: offer.ends_at ?? null,
      metadata: { promo_claim_id: claim.id, promo_offer_id: offer.id, ref_id: refId },
    });
  }

  // 7) Marcar claim como aplicado
  await supabaseAdmin
    .from("promo_claims")
    .update({
      status: "applied",
      bonus_awarded: bonus,
      free_rounds_awarded: freeRounds,
      wagering_required: wageringRequired,
      wagering_progress: 0,
      metadata: {
        ...(claim as any).metadata,
        applied_at: new Date().toISOString(),
        deposit_ref: depositRef,
        ref_id: refId,
      },
    })
    .eq("id", claim.id);

  return {
    applied: bonus > 0 || freeRounds > 0,
    claimId: claim.id,
    offerId: offer.id,
    offerSlug: offer.slug,
    bonusAwarded: bonus,
    freeRoundsAwarded: freeRounds,
    wageringRequired,
  };
}
