export const runtime = "nodejs";

import crypto from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { walletApplyDelta } from "@/lib/walletApplyDelta";

function isMissingTable(msg: string) {
  const m = msg.toLowerCase();
  return m.includes("relation") && m.includes("does not exist");
}
function isDuplicate(msg: string) {
  const m = msg.toLowerCase();
  return m.includes("duplicate") || m.includes("unique") || m.includes("23505");
}

function safeEqual(a: string, b: string) {
  try {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

function verifySignature(bodyText: string, headerSigRaw: string | null) {
  const secret = process.env.ASTROPAY_WEBHOOK_SECRET || "";
  if (!secret) return { enforced: false, ok: true };

  const headerSig = String(headerSigRaw || "").trim();
  if (!headerSig) return { enforced: true, ok: false };

  const cleaned = headerSig.includes("=") ? headerSig.split("=").pop()!.trim() : headerSig;

  const hex = crypto.createHmac("sha256", secret).update(bodyText, "utf8").digest("hex");
  const b64 = crypto.createHmac("sha256", secret).update(bodyText, "utf8").digest("base64");

  const ok = safeEqual(cleaned.toLowerCase(), hex.toLowerCase()) || safeEqual(cleaned, b64);
  return { enforced: true, ok };
}

async function maybeCreditAffiliateFirstDeposit(params: { userId: string; amount: number; intentId: string }) {
  try {
    const reward = Number(process.env.AFFILIATE_FIRST_DEPOSIT_REWARD ?? 20); // MXN
    const min = Number(process.env.AFFILIATE_FIRST_DEPOSIT_MIN ?? 50); // MXN
    if (!Number.isFinite(reward) || reward <= 0) return;
    if (!Number.isFinite(min) || params.amount < min) return;

    const { data: ref, error: refErr } = await supabaseAdmin
      .from("affiliate_referrals")
      .select("id, affiliate_user_id, status, total_deposited, total_commission")
      .eq("referred_user_id", params.userId)
      .maybeSingle();

    if (refErr) {
      if (isMissingTable(String(refErr.message || ""))) return;
      console.error("affiliate_referrals read error:", refErr);
      return;
    }
    if (!ref) return;
    if (ref.status !== "registered") return;

    const refId = `aff_firstdep:${params.intentId}`;

    const ins = await supabaseAdmin.from("affiliate_commissions").insert({
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
      console.error("affiliate_commissions insert error:", ins.error);
      return;
    }

    const credit = await walletApplyDelta(supabaseAdmin, {
      userId: ref.affiliate_user_id,
      deltaBalance: reward,
      deltaBonus: 0,
      deltaLocked: 0,
      reason: "affiliate_first_deposit",
      refId,
      metadata: { referred_user_id: params.userId, intent_id: params.intentId },
    });

    if (credit.error) {
      console.error("affiliate wallet credit error:", credit.error);
      await supabaseAdmin.from("affiliate_commissions").delete().eq("ref_id", refId);
      return;
    }

    await supabaseAdmin
      .from("affiliate_referrals")
      .update({
        status: "first_deposit",
        total_deposited: Number(ref.total_deposited || 0) + params.amount,
        total_commission: Number(ref.total_commission || 0) + reward,
      })
      .eq("id", ref.id);
  } catch (e) {
    console.error("maybeCreditAffiliateFirstDeposit error:", e);
  }
}

export async function POST(req: Request) {
  const bodyText = await req.text();
  const sigHeader = req.headers.get("x-astropay-signature");

  const sig = verifySignature(bodyText, sigHeader);
  if (sig.enforced && !sig.ok) {
    return NextResponse.json({ ok: false, error: "INVALID_SIGNATURE" }, { status: 401 });
  }

  let payload: any = null;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }

  const intentId = String(payload?.intent_id || payload?.intentId || payload?.data?.intent_id || "").trim();
  if (!intentId) return NextResponse.json({ ok: false, error: "NO_INTENT" }, { status: 400 });

  const { data: intent, error: iErr } = await supabaseAdmin
    .from("deposit_intents")
    .select("*")
    .eq("intent_id", intentId)
    .maybeSingle();

  if (iErr) return NextResponse.json({ ok: false, error: iErr.message }, { status: 500 });
  if (!intent) return NextResponse.json({ ok: true }); // idempotente

  if (intent.status === "credited") return NextResponse.json({ ok: true });

  const status = String(payload?.status || payload?.data?.status || "success").toLowerCase();
  if (!["success", "paid", "credited", "approved"].includes(status)) {
    await supabaseAdmin.from("deposit_intents").update({ status: "failed" }).eq("intent_id", intentId);
    return NextResponse.json({ ok: true });
  }

  const userId = String(intent.user_id);
  const amount = Number(intent.amount || 0);

  const refId = `astropay_deposit:${intentId}`;

  const apply = await walletApplyDelta(supabaseAdmin, {
    userId,
    deltaBalance: amount,
    deltaBonus: 0,
    deltaLocked: 0,
    reason: "deposit_astropay",
    refId,
    metadata: { intent_id: intentId },
  });

  if (apply.error) return NextResponse.json({ ok: false, error: apply.error }, { status: 500 });

  await supabaseAdmin.from("deposit_intents").update({ status: "credited" }).eq("intent_id", intentId);

  await maybeCreditAffiliateFirstDeposit({ userId, amount, intentId });

  return NextResponse.json({ ok: true });
}