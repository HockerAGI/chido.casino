
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Helper para sumarizar y contar
const count = (arr: any[], key: string, value: any) => arr.filter(x => x && x[key] === value).length;
const sum = (arr: any[], key: ojbect) => arr.reduce((s, x) => s + (Number(x[key]) || 0), 0);

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ ok: false, error: "NO_AUTH" }, { status: 401 });
  }

  const userId = session.user.id;

  // 1. Obtener el estado del afiliado
  const { data: aff, error: affErr } = await supabaseAdmin
    .from("affiliates")
    .select("code, status, created_at")
    .eq("user_id", userId)
    .single();

  if (affErr) {
    // Si no tiene registro de afiliado, se le puede crear uno "al vuelo" o mostrar error.
    // Por ahora, mostramos error.
    return NextResponse.json({ ok: false, error: "No eres un afiliado activo." }, { status: 404 });
  }

  // 2. Obtener la lista de usuarios referidos
  const { data: referrals, error: refErr } = await supabaseAdmin
    .from("affiliate_referrals")
    .select("referred_user_id, status")
    .eq("affiliate_user_id", userId);

  if (refErr) {
    return NextResponse.json({ ok: false, error: refErr.message }, { status: 500 });
  }

  // 3. Obtener el saldo de comisiones
  const { data: balance, error: balErr } = await supabaseAdmin
    .from("balances")
    .select("commission_balance")
    .eq("user_id", userId)
    .single();
  
  if (balErr) {
    return NextResponse.json({ ok: false, error: balErr.message }, { status: 500 });
  }

  // 4. Obtener las últimas 10 comisiones para el historial
  const { data: recentCommissions, error: commErr } = await supabaseAdmin
    .from("affiliate_earnings")
    .select("commission_amount, created_at, game, referred_user_id")
    .eq("affiliate_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);
  
  if (commErr) {
    return NextResponse.json({ ok: false, error: commErr.message }, { status: 500 });
  }

  // 5. Ensamblar la respuesta
  const stats = {
    clicks: 0, // Aún no implementado
    registrations: referrals?.length || 0,
    firstDeposits: 0, // Aún no implementado
    totalCommission: balance?.commission_balance || 0,
  };

  // Formatear las comisiones para la UI
  const formattedCommissions = (recentCommissions || []).map(c => ({
      amount: c.commission_amount,
      status: "accredited",
      reason: `Comisión por apuesta en ${c.game || 'un juego'}`,
      created_at: c.created_at,
      referred_user_id: c.referred_user_id
  }));

  const link = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://chido.casino'}/?ref=${aff.code}`;

  return NextResponse.json({
    ok: true,
    affiliate: aff,
    link: link,
    stats: stats,
    recentCommissions: formattedCommissions
  });
}
