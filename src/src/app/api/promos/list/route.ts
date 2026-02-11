export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function isMissingTable(msg: string) {
  const m = msg.toLowerCase();
  return m.includes("relation") && m.includes("does not exist");
}

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    // 1) promos activas
    const promosRes = await supabaseAdmin
      .from("promos")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(50);

    if (promosRes.error) {
      const msg = String(promosRes.error.message || "");
      if (isMissingTable(msg)) {
        return NextResponse.json({ ok: true, promos: [], warning: "PROMOS_TABLE_MISSING" });
      }
      return NextResponse.json({ ok: false, error: promosRes.error.message }, { status: 500 });
    }

    const promos = (promosRes.data ?? []) as any[];

    // 2) redemptions del usuario (para marcar redeemed)
    const redRes = await supabaseAdmin
      .from("promo_redemptions")
      .select("promo_id, code, status, created_at, awarded_amount")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(200);

    let redeemedMap = new Map<string, any>();
    if (!redRes.error && Array.isArray(redRes.data)) {
      for (const r of redRes.data as any[]) {
        if (!r?.promo_id) continue;
        if (!redeemedMap.has(String(r.promo_id))) redeemedMap.set(String(r.promo_id), r);
      }
    }

    const now = Date.now();

    const out = promos
      .map((p) => {
        const expiresAt = p.expires_at ? new Date(p.expires_at).getTime() : null;
        const expired = expiresAt != null ? expiresAt <= now : false;

        const red = redeemedMap.get(String(p.id));
        const redeemed = !!red && String(red.status || "").toLowerCase() === "applied";

        const rewardType = String(p.reward_type ?? p.type ?? "bonus").toLowerCase(); // bonus | balance
        const rewardAmount = Number(p.reward_amount ?? p.amount ?? 0);

        return {
          id: p.id,
          code: p.code,
          title: p.title ?? p.name ?? "Promo",
          description: p.description ?? "",
          rewardType,
          rewardAmount,
          expiresAt: p.expires_at ?? null,
          perUserLimit: Number(p.per_user_limit ?? 1),
          maxRedemptions: p.max_redemptions ?? null,
          active: !!p.active,
          expired,
          redeemed,
          redeemedAt: redeemed ? red.created_at : null,
        };
      })
      .filter((p) => p.active && !p.expired);

    return NextResponse.json({ ok: true, promos: out });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error interno" }, { status: 500 });
  }
}