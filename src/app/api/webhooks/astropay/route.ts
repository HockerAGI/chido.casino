export const runtime = "nodejs";

import crypto from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { walletApplyDelta } from "@/lib/walletApplyDelta";

function timingSafeEqualHex(a: string, b: string) {
  const aa = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

function hmacHex(secret: string, payload: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export async function POST(req: Request) {
  try {
    const secret = process.env.ASTROPAY_WEBHOOK_SECRET || "";
    if (!secret) {
      return NextResponse.json({ ok: false, error: "Webhook secret not configured" }, { status: 500 });
    }

    const signature = req.headers.get("x-astropay-signature") || "";
    const raw = await req.text();

    const computed = hmacHex(secret, raw);
    if (!signature || !timingSafeEqualHex(signature, computed)) {
      return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(raw) as { type?: string; data?: any };
    const type = String(event?.type || "").toLowerCase();
    const data = event?.data || {};

    // -------------------------
    // Deposits
    // -------------------------
    if (type.includes("deposit")) {
      const intentId = String(data?.intent_id || data?.intentId || data?.metadata?.intent_id || "").trim();
      let userId = String(data?.user_id || data?.userId || data?.metadata?.user_id || "").trim();
      let amount = Number(data?.amount);

      if ((!userId || !Number.isFinite(amount)) && intentId) {
        const { data: intent } = await supabaseAdmin
          .from("deposit_intents")
          .select("user_id, amount")
          .eq("id", intentId)
          .maybeSingle();

        if (!userId) userId = String(intent?.user_id || "");
        if (!Number.isFinite(amount)) amount = Number(intent?.amount || 0);
      }

      if (!intentId || !userId || !Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ ok: true, ignored: true });
      }

      // mark paid (best-effort)
      await supabaseAdmin
        .from("deposit_intents")
        .update({ status: "paid", provider_payload: data })
        .eq("id", intentId);

      const credit = await walletApplyDelta(supabaseAdmin, {
        userId,
        deltaBalance: +amount,
        deltaBonus: 0,
        deltaLocked: 0,
        reason: "deposit_paid",
        refId: intentId,
        metadata: { provider: "astropay", event: type },
      });

      if (credit.error) {
        console.error("deposit wallet error:", credit.error);
        return NextResponse.json({ ok: false, error: credit.error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true });
    }

    // -------------------------
    // Withdrawals (optional)
    // -------------------------
    if (type.includes("withdraw")) {
      const externalId = String(data?.external_id || data?.externalId || data?.metadata?.external_id || "").trim();
      if (!externalId) return NextResponse.json({ ok: true, ignored: true });

      const { data: wr } = await supabaseAdmin
        .from("withdraw_requests")
        .select("user_id, amount, status")
        .eq("external_id", externalId)
        .maybeSingle();

      if (!wr) return NextResponse.json({ ok: true, ignored: true });

      const userId = String((wr as any).user_id || "");
      const amount = Number((wr as any).amount || 0);

      const isPaid = type.includes("paid") || type.includes("succeeded") || String(data?.status || "").toLowerCase() === "paid";
      const isFailed =
        type.includes("failed") ||
        type.includes("rejected") ||
        ["failed", "rejected", "canceled"].includes(String(data?.status || "").toLowerCase());

      if (isPaid) {
        await supabaseAdmin
          .from("withdraw_requests")
          .update({ status: "paid", provider_payload: data })
          .eq("external_id", externalId);

        const r = await walletApplyDelta(supabaseAdmin, {
          userId,
          deltaBalance: 0,
          deltaBonus: 0,
          deltaLocked: -amount,
          reason: "withdraw_paid",
          refId: `${externalId}:paid`,
          metadata: { provider: "astropay" },
        });
        if (r.error) return NextResponse.json({ ok: false, error: r.error.message }, { status: 500 });
      }

      if (isFailed) {
        await supabaseAdmin
          .from("withdraw_requests")
          .update({ status: "failed", provider_payload: data })
          .eq("external_id", externalId);

        const r = await walletApplyDelta(supabaseAdmin, {
          userId,
          deltaBalance: +amount,
          deltaBonus: 0,
          deltaLocked: -amount,
          reason: "withdraw_refund",
          refId: `${externalId}:refund`,
          metadata: { provider: "astropay" },
        });
        if (r.error) return NextResponse.json({ ok: false, error: r.error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true, ignored: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e?.message || "Error interno" }, { status: 500 });
  }
}