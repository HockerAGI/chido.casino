export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { walletApplyDelta } from "@/lib/walletApplyDelta";

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return NextResponse.json({ ok: false, error: "NO_AUTH" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const code = String(body?.code || "").trim().toUpperCase();
  if (!code) return NextResponse.json({ ok: false, error: "CODE_REQUIRED" }, { status: 400 });

  // 1) promo activa
  const { data: promo, error: promoErr } = await supabaseAdmin
    .from("promos")
    .select("*")
    .eq("code", code)
    .eq("is_active", true)
    .maybeSingle();

  if (promoErr) return NextResponse.json({ ok: false, error: promoErr.message }, { status: 500 });
  if (!promo) return NextResponse.json({ ok: false, error: "INVALID_CODE" }, { status: 404 });

  // 2) no duplicar
  const { data: used, error: usedErr } = await supabaseAdmin
    .from("promo_redemptions")
    .select("id")
    .eq("user_id", session.user.id)
    .eq("promo_code", code)
    .maybeSingle();

  if (usedErr) return NextResponse.json({ ok: false, error: usedErr.message }, { status: 500 });
  if (used) return NextResponse.json({ ok: false, error: "ALREADY_USED" }, { status: 409 });

  // 3) aplicar bonus
  const bonus = Number(promo.bonus_amount || 0);
  if (bonus <= 0) return NextResponse.json({ ok: false, error: "PROMO_NO_BONUS" }, { status: 400 });

  const refId = `promo:${code}:${session.user.id}`;

  const apply = await walletApplyDelta(supabaseAdmin, {
    userId: session.user.id,
    deltaBalance: 0,
    deltaBonus: bonus,
    deltaLocked: 0,
    reason: "promo_redeem",
    refId,
    metadata: { promo: code },
  });

  if (apply.error) return NextResponse.json({ ok: false, error: apply.error.message }, { status: 500 });

  // 4) registrar redención
  const { error: insErr } = await supabaseAdmin.from("promo_redemptions").insert({
    user_id: session.user.id,
    promo_code: code,
    bonus_amount: bonus,
  });

  if (insErr) return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, bonus });
}