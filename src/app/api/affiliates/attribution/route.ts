export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function isDuplicate(msg: string) {
  const m = msg.toLowerCase();
  return m.includes("duplicate") || m.includes("unique") || m.includes("23505");
}

export async function POST() {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return NextResponse.json({ ok: false, error: "NO_AUTH" }, { status: 401 });

  const ref = cookies().get("chido_ref")?.value?.trim()?.toUpperCase() || "";
  const res = NextResponse.json({ ok: true, attributed: false });

  // siempre limpiamos cookie (evita loops)
  res.cookies.set("chido_ref", "", { maxAge: 0, path: "/" });

  if (!ref) return res;

  const { data: aff, error } = await supabaseAdmin
    .from("affiliates")
    .select("user_id, code, status")
    .eq("code", ref)
    .eq("status", "active")
    .maybeSingle();

  if (error || !aff) return res;
  if (aff.user_id === session.user.id) return res;

  const ins = await supabaseAdmin.from("affiliate_referrals").insert({
    affiliate_user_id: aff.user_id,
    referred_user_id: session.user.id,
    status: "registered",
  });

  if (ins.error && !isDuplicate(String(ins.error.message || ""))) {
    return NextResponse.json({ ok: false, error: ins.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, attributed: true, ref });
}