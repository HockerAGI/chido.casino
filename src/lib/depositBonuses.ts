import "server-only";

import { walletApplyDelta } from "@/lib/walletApplyDelta";

function isMissingTable(msg: string) {
  const m = (msg || "").toLowerCase();
  return m.includes("relation") && m.includes("does not exist");
}

function isDuplicate(msg: string) {
  const m = (msg || "").toLowerCase();
  return m.includes("duplicate") || m.includes("unique") || m.includes("23505");
}

export async function creditAffiliateFirstDepositBonus(
  supabase: any,
  params: { userId: string; amount: number; intentId: string }
) {
  try {
    const reward = Number(process.env.AFFILIATE_FIRST_DEPOSIT_REWARD ?? 20);
    const min = Number(process.env.AFFILIATE_FIRST_DEPOSIT_MIN ?? 50);
    if (!Number.isFinite(reward) || reward <= 0) return;
    if (!Number.isFinite(min) || params.amount < min) return;

    const { data: ref, error: refErr } = await supabase
      .from("affiliate_referrals")
      .select("id, affiliate_user_id, status, total_deposited, total_commission")
      .eq("referred_user_id", params.userId)
      .maybeSingle();

    if (refErr) {
      if (isMissingTable(String(refErr.message || ""))) return;
      return;
    }
    if (!ref || ref.status !== "registered") return;

    const refId = `aff_firstdep:${params.intentId}`;

    const ins = await supabase.from("affiliate_commissions").insert({
      affiliate_user_id: ref.affiliate_user_id,
      referred_user_id: params.userId,
      amount: reward,
      reason: "first_deposit_bonus",
      ref_id: refId,
      status: "credited",
      metadata: { deposit_amount: params.amount, intent_id: params.intentId },
    });

    if (ins.error) {
      if (isMissingTable(String(ins.error.message || ""))) return;
      if (isDuplicate(String(ins.error.message || ""))) return;
      return;
    }

    await walletApplyDelta(supabase, {
      userId: ref.affiliate_user_id,
      deltaBalance: reward,
      deltaBonus: 0,
      deltaLocked: 0,
      reason: "affiliate_first_deposit",
      refId,
      metadata: { referred_user_id: params.userId, intent_id: params.intentId },
    });

    await supabase
      .from("affiliate_referrals")
      .update({
        status: "first_deposit",
        total_deposited: Number(ref.total_deposited || 0) + params.amount,
        total_commission: Number(ref.total_commission || 0) + reward,
      })
      .eq("id", ref.id);
  } catch {
    // Best effort bonus.
  }
}
