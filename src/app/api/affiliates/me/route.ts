export const runtime = "nodejs";

import crypto from "crypto";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function genCode() {
  const raw = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `CHIDO-${raw.slice(0, 6)}`;
}

async function countExact(table: string, filter: { col: string; val: any }[]) {
  let q: any = supabaseAdmin.from(table).select("*", { count: "exact", head: true });
  for (const f of filter) q = q.eq(f.col, f.val);
  const res = await q;
  return Number(res.count || 0);
}

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "NO_AUTH" }, { status: 401 });

  const userId = session.user.id;

  // 1) Asegurar affiliate code real
  let { data: aff } = await supabaseAdmin
    .from("affiliates")
    .select("user_id,code,status,created_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (!aff) {
    // crear con retry por colisión (real)
    let created: any = null;
    for (let i = 0; i < 6; i++) {
      const code = genCode();
      const ins = await supabaseAdmin
        .from("affiliates")
        .insert({ user_id: userId, code, status: "active" })
        .select("user_id,code,status,created_at")
        .maybeSingle();

      if (!ins.error && ins.data) {
        created = ins.data;
        break;
      }
    }
    aff = created;
  }

  if (!aff) return NextResponse.json({ ok: false, error: "AFF_CREATE_FAILED" }, { status: 500 });

  // 2) Stats reales
  const clicks = await countExact("affiliate_clicks", [{ col: "affiliate_user_id", val: userId }]);
  const registrations = await countExact("affiliate_referrals", [{ col: "affiliate_user_id", val: userId }]);

  // first deposits (status actualizado por webhook)
  const fdRes: any = await supabaseAdmin
    .from("affiliate_referrals")
    .select("*", { count: "exact", head: true })
    .eq("affiliate_user_id", userId)
    .in("status", ["first_deposit"]);

  const firstDeposits = Number(fdRes.count || 0);

  // Comisiones (sum server-side)
  const comm = await supabaseAdmin
    .from("affiliate_commissions")
    .select("amount,status,created_at,reason,referred_user_id")
    .eq("affiliate_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(25);

  const rows = (comm.data || []) as any[];
  const totalCommission = rows
    .filter((x) => String(x.status || "").toLowerCase() === "credited")
    .reduce((s, x) => s + Number(x.amount || 0), 0);

  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://chido.casino";
  const link = `${site.replace(/\/$/, "")}/r/${encodeURIComponent(String(aff.code))}`;

  return NextResponse.json({
    ok: true,
    affiliate: { code: aff.code, status: aff.status, created_at: aff.created_at },
    link,
    stats: {
      clicks,
      registrations,
      firstDeposits,
      totalCommission,
    },
    recentCommissions: rows.slice(0, 10).map((x) => ({
      amount: Number(x.amount || 0),
      status: String(x.status || ""),
      reason: String(x.reason || ""),
      created_at: x.created_at || null,
      referred_user_id: x.referred_user_id || null,
    })),
  });
}