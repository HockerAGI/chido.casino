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

  if (!session) return NextResponse.json({ ok: false, error: "NO_AUTH" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("promos")
    .select("code, title, description, bonus_amount, min_deposit, starts_at, ends_at, is_active")
    .eq("is_active", true)
    .order("starts_at", { ascending: false });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, promos: data || [] });
}