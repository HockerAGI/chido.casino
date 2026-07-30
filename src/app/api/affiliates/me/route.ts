import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function isMissingTable(msg: string) {
  const m = (msg || "").toLowerCase();
  return m.includes("relation") && m.includes("does not exist");
}

export async function GET() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ ok: false, error: "NO_AUTH" }, { status: 401 });
  }

  const userId = session.user.id;

  const { data: aff, error: affErr } = await supabaseAdmin
    .from("affiliates")
    .select("code, status, created_at")
    .eq("user_id", userId)
    .single();

  if (affErr || !aff) {
    return NextResponse.json(
      { ok: false, error: "Aún no eres afiliado activo. Ponte en contacto para activar tu cuenta de afiliado." },
      { status: 404 }
    );
  }

  const { data: referrals, error: refErr } = await supabaseAdmin
    .from("affiliate_referrals")
    .select("referred_user_id, status, total_deposited, total_commission")
    .eq("affiliate_user_id", userId);

  if (refErr && !isMissingTable(String(refErr.message || ""))) {
    return NextResponse.json({ ok: false, error: refErr.message }, { status: 500 });
  }

  const { data: balance, error: balErr } = await supabaseAdmin
    .from("balances")
    .select("commission_balance")
    .eq("user_id", userId)
    .maybeSingle();

  if (balErr) {
    return NextResponse.json({ ok: false, error: balErr.message }, { status: 500 });
  }

  // Use affiliate_commissions table (NOT affiliate_earnings which doesn't exist)
  const { data: recentCommissions, error: commErr } = await supabaseAdmin
    .from("affiliate_commissions")
    .select("amount, created_at, reason, referred_user_id, status")
    .eq("affiliate_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (commErr && !isMissingTable(String(commErr.message || ""))) {
    return NextResponse.json({ ok: false, error: commErr.message }, { status: 500 });
  }

  // Count clicks from affiliate_clicks table (best-effort)
  let clicks = 0;
  try {
    const { count } = await supabaseAdmin
      .from("affiliate_clicks")
      .select("*", { count: "exact", head: true })
      .eq("affiliate_user_id", userId);
    clicks = Number(count ?? 0);
  } catch {
    // ignore
  }

  // Count first deposits from referrals with status='first_deposit'
  const firstDeposits = (referrals || []).filter(
    (r: any) => r.status === "first_deposit"
  ).length;

  const stats = {
    clicks,
    registrations: referrals?.length || 0,
    firstDeposits,
    totalCommission: Number(balance?.commission_balance || 0),
  };

  const formattedCommissions = (recentCommissions || []).map((c: any) => ({
    amount: c.amount,
    status: c.status || "accredited",
    reason: c.reason || "Comisión por referencia",
    created_at: c.created_at,
    referred_user_id: c.referred_user_id,
  }));

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://chidocasino.vercel.app";
  const link = `${siteUrl.replace(/\/$/, "")}/?ref=${aff.code}`;

  return NextResponse.json({
    ok: true,
    affiliate: aff,
    link,
    stats,
    recentCommissions: formattedCommissions,
  });
}
