import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const code = String(body?.code || "").trim().toUpperCase();
    if (!code) return NextResponse.json({ error: "Código inválido" }, { status: 400 });

    const { data: promo, error: pErr } = await supabaseAdmin
      .from("promo_codes")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (pErr) throw pErr;
    if (!promo || !promo.is_active) return NextResponse.json({ error: "PROMO_NO_DISPONIBLE" }, { status: 404 });

    const now = new Date();
    if (promo.starts_at && new Date(promo.starts_at) > now) return NextResponse.json({ error: "PROMO_AUN_NO_INICIA" }, { status: 400 });
    if (promo.ends_at && new Date(promo.ends_at) < now) return NextResponse.json({ error: "PROMO_EXPIRADA" }, { status: 400 });

    const { data: already } = await supabaseAdmin
      .from("promo_redemptions")
      .select("id")
      .eq("promo_id", promo.id)
      .eq("user_id", session.user.id)
      .limit(1);

    if (already && already.length) return NextResponse.json({ error: "YA_RECLAMADA" }, { status: 409 });

    if (promo.max_redemptions != null) {
      const { count } = await supabaseAdmin
        .from("promo_redemptions")
        .select("id", { count: "exact", head: true })
        .eq("promo_id", promo.id);

      if ((count || 0) >= promo.max_redemptions) {
        return NextResponse.json({ error: "PROMO_AGOTADA" }, { status: 400 });
      }
    }

    await supabaseAdmin.from("promo_redemptions").insert({
      promo_id: promo.id,
      user_id: session.user.id,
      created_at: new Date().toISOString(),
    });

    const rewardBalance = Number(promo.reward_balance || 0);
    const rewardBonus = Number(promo.reward_bonus || 0);

    const { data: w, error: wErr } = await supabaseAdmin.rpc("wallet_apply_delta", {
      p_user_id: session.user.id,
      p_delta_balance: rewardBalance,
      p_delta_bonus: rewardBonus,
      p_delta_locked: 0,
      p_reason: "promo_redeem",
      p_ref_id: `promo:${promo.code}`,
      p_metadata: { promo: promo.code },
    });

    if (wErr) throw wErr;

    const row = Array.isArray(w) ? w[0] : w;

    return NextResponse.json({
      ok: true,
      promo: { code: promo.code, title: promo.title },
      rewardBalance,
      rewardBonus,
      newBalance: Number(row?.balance ?? 0),
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Error interno" }, { status: 500 });
  }
}