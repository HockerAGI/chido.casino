export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ ok: false, error: "NO_AUTH" }, { status: 401 });
  }

  const now = new Date().toISOString();

  const { data: promos, error } = await supabaseAdmin
    .from("promos")
    .select("id, code, title, description, reward_type, reward_amount, expires_at, active, per_user_limit, max_redemptions")
    .eq("active", true)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const { data: redemptions } = await supabaseAdmin
    .from("promo_redemptions")
    .select("promo_id")
    .eq("user_id", session.user.id);

  const redeemedSet = new Set((redemptions || []).map((r) => r.promo_id));

  return NextResponse.json({
    ok: true,
    promos: (promos || []).map((p: any) => ({
      code: p.code,
      title: p.title,
      description: p.description,
      rewardType: p.reward_type,
      rewardAmount: Number(p.reward_amount || 0),
      expiresAt: p.expires_at,
      redeemed: redeemedSet.has(p.id),
    })),
  });
}