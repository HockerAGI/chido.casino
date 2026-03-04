export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("self_excluded_until,self_excluded_at,self_excluded_reason,kyc_status")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const until = data?.self_excluded_until ? String(data.self_excluded_until) : null;
  const excluded = until ? Date.now() < Date.parse(until) : false;

  return NextResponse.json({
    ok: true,
    excluded,
    until,
    reason: data?.self_excluded_reason ?? null,
    kyc_status: data?.kyc_status ?? null,
  });
}