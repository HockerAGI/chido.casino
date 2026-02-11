export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { walletApplyDelta } from "@/lib/walletApplyDelta";

function normalizeCode(input: string) {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

function isMissingTable(msg: string) {
  const m = msg.toLowerCase();
  return m.includes("relation") && m.includes("does not exist");
}

function isDuplicate(msg: string) {
  const m = msg.toLowerCase();
  return m.includes("duplicate") || m.includes("unique") || m.includes("already exists");
}

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const codeRaw = String(body?.code || "");
    const promoIdRaw = String(body?.promoId || "");

    const code = codeRaw ? normalizeCode(codeRaw) : "";
    const promoId = promoIdRaw.trim();

    if (!code && !promoId) {
      return NextResponse.json({ ok: false, error: "Código requerido" }, { status: 400 });
    }

    // 1) buscar promo
    let promoRes = promoId
      ? await supabaseAdmin.from("promos").select("*").eq("id", promoId).maybeSingle()
      : await supabaseAdmin.from("promos").select("*").eq("code", code).maybeSingle();

    if (promoRes.error) {
      const msg = String(promoRes.error.message || "");
      if (isMissingTable(msg)) {
        return NextResponse.json({ ok: false, error: "PROMOS_TABLE_MISSING" }, { status: 500 });
      }
      return NextResponse.json({ ok: false, error: promoRes.error.message }, { status: 500 });
    }

    const promo = promoRes.data as any;
    if (!promo) {
      return NextResponse.json({ ok: false, error: "PROMO_NOT_FOUND" }, { status: 404 });
    }

    if (!promo.active) {
      return NextResponse.json({ ok: false, error: "PROMO_INACTIVE" }, { status: 400 });
    }

    if (promo.expires_at) {
      const exp = new Date(promo.expires_at).getTime();
      if (Number.isFinite(exp) && exp <= Date.now()) {
        return NextResponse.json({ ok: false, error: "PROMO_EXPIRED" }, { status: 400 });
      }
    }

    const rewardType = String(promo.reward_type ?? promo.type ?? "bonus").toLowerCase(); // bonus | balance
    const rewardAmount = Number(promo.reward_amount ?? promo.amount ?? 0);
    if (!Number.isFinite(rewardAmount) || rewardAmount <= 0) {
      return NextResponse.json({ ok: false, error: "PROMO_INVALID_REWARD" }, { status: 500 });
    }

    const perUserLimit = Number(promo.per_user_limit ?? 1);
    const maxRedemptions = promo.max_redemptions != null ? Number(promo.max_redemptions) : null;

    // 2) caps (best effort)
    if (maxRedemptions != null && Number.isFinite(maxRedemptions) && maxRedemptions > 0) {
      const c = await supabaseAdmin
        .from("promo_redemptions")
        .select("id", { count: "exact", head: true })
        .eq("promo_id", promo.id)
        .eq("status", "applied");

      if (!c.error) {
        const used = Number(c.count ?? 0);
        if (used >= maxRedemptions) {
          return NextResponse.json({ ok: false, error: "PROMO_SOLD_OUT" }, { status: 400 });
        }
      }
    }

    // per user
    if (Number.isFinite(perUserLimit) && perUserLimit > 0) {
      const c = await supabaseAdmin
        .from("promo_redemptions")
        .select("id", { count: "exact", head: true })
        .eq("promo_id", promo.id)
        .eq("user_id", session.user.id)
        .eq("status", "applied");

      if (!c.error) {
        const used = Number(c.count ?? 0);
        if (used >= perUserLimit) {
          return NextResponse.json({ ok: false, error: "ALREADY_REDEEMED" }, { status: 400 });
        }
      }
    }

    const externalId = `promo_${promo.id}_${session.user.id}_${Date.now()}`;

    // 3) insert redemption PENDING (idempotencia por unique)
    const ins = await supabaseAdmin.from("promo_redemptions").insert({
      user_id: session.user.id,
      promo_id: promo.id,
      code: String(promo.code ?? code),
      status: "pending",
      awarded_amount: rewardAmount,
      metadata: { rewardType, externalId },
    });

    if (ins.error) {
      const msg = String(ins.error.message || "");
      if (isMissingTable(msg)) {
        return NextResponse.json({ ok: false, error: "PROMO_REDEMPTIONS_TABLE_MISSING" }, { status: 500 });
      }
      if (isDuplicate(msg)) {
        return NextResponse.json({ ok: false, error: "ALREADY_REDEEMED" }, { status: 400 });
      }
      return NextResponse.json({ ok: false, error: ins.error.message }, { status: 500 });
    }

    // 4) aplicar reward en wallet
    const deltaBalance = rewardType === "balance" ? rewardAmount : 0;
    const deltaBonus = rewardType === "bonus" ? rewardAmount : 0;

    const w = await walletApplyDelta(supabaseAdmin, {
      userId: session.user.id,
      deltaBalance,
      deltaBonus,
      deltaLocked: 0,
      reason: "promo_redeem",
      refId: externalId,
      metadata: {
        promoId: promo.id,
        code: String(promo.code ?? code),
        rewardType,
        rewardAmount,
      },
    });

    if (w.error) {
      // marcar fail (best-effort)
      await supabaseAdmin
        .from("promo_redemptions")
        .update({ status: "failed", metadata: { rewardType, rewardAmount, externalId, wallet_error: w.error } })
        .eq("user_id", session.user.id)
        .eq("promo_id", promo.id);

      return NextResponse.json({ ok: false, error: "WALLET_ERROR" }, { status: 500 });
    }

    // 5) marcar applied
    await supabaseAdmin
      .from("promo_redemptions")
      .update({ status: "applied" })
      .eq("user_id", session.user.id)
      .eq("promo_id", promo.id);

    return NextResponse.json({
      ok: true,
      promo: {
        id: promo.id,
        code: promo.code,
        title: promo.title ?? promo.name ?? "Promo",
        rewardType,
        rewardAmount,
      },
      message: rewardType === "balance" ? `Listo: +$${rewardAmount} MXN` : `Listo: +$${rewardAmount} MXN (BONUS)`,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error interno" }, { status: 500 });
  }
}