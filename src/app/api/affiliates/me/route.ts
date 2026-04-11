import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ ok: false, error: "NO_AUTH" }, { status: 401 });
    }

    const userId = user.id;

    const { data: aff, error: affErr } = await supabaseAdmin
      .from("affiliates")
      .select("code, status, created_at")
      .eq("user_id", userId)
      .single();

    if (affErr || !aff) {
      return NextResponse.json({ ok: false, error: "No eres un afiliado activo." }, { status: 404 });
    }

    const { data: referrals, error: refErr } = await supabaseAdmin
      .from("affiliate_referrals")
      .select("referred_user_id, status")
      .eq("affiliate_user_id", userId);

    if (refErr) {
      return NextResponse.json({ ok: false, error: refErr.message }, { status: 500 });
    }

    const { data: balance, error: balErr } = await supabaseAdmin
      .from("balances")
      .select("commission_balance")
      .eq("user_id", userId)
      .single();

    if (balErr) {
      return NextResponse.json({ ok: false, error: balErr.message }, { status: 500 });
    }

    const { data: recentCommissions, error: commErr } = await supabaseAdmin
      .from("affiliate_earnings")
      .select("commission_amount, created_at, game, referred_user_id")
      .eq("affiliate_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (commErr) {
      return NextResponse.json({ ok: false, error: commErr.message }, { status: 500 });
    }

    const stats = {
      clicks: 0,
      registrations: referrals?.length || 0,
      firstDeposits: 0,
      totalCommission: Number(balance?.commission_balance || 0),
    };

    const formattedCommissions = (recentCommissions || []).map((c) => ({
      amount: c.commission_amount,
      status: "accredited",
      reason: `Comisión por apuesta en ${c.game || "un juego"}`,
      created_at: c.created_at,
      referred_user_id: c.referred_user_id,
    }));

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://chido.casino";
    const link = `${siteUrl.replace(/\/$/, "")}/?ref=${aff.code}`;

    return NextResponse.json({
      ok: true,
      affiliate: aff,
      link,
      stats,
      recentCommissions: formattedCommissions,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "AFFILIATES_ME_ERROR" },
      { status: 500 }
    );
  }
}