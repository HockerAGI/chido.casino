import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeCode(input: string | null | undefined) {
  return String(input || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "");
}

export async function POST() {
  const cookieStore = await cookies();
  const ref = normalizeCode(cookieStore.get("chido_ref")?.value);

  const res = NextResponse.json({ ok: true, attributed: false });

  if (!ref) {
    res.cookies.set("chido_ref", "", { maxAge: 0, path: "/" });
    return res;
  }

  const { data: affiliate, error } = await supabaseAdmin
    .from("affiliates")
    .select("user_id, code, status")
    .eq("code", ref)
    .eq("status", "active")
    .maybeSingle();

  if (error || !affiliate) {
    res.cookies.set("chido_ref", "", { maxAge: 0, path: "/" });
    return res;
  }

  res.cookies.set("chido_ref", "", { maxAge: 0, path: "/" });

  return NextResponse.json({
    ok: true,
    attributed: true,
    code: affiliate.code,
  });
}

export async function GET() {
  return POST();
}