export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = String(url.searchParams.get("code") || "")
    .trim()
    .toUpperCase();

  if (!code) return NextResponse.json({ ok: false, error: "NO_CODE" }, { status: 400 });

  // Validamos que exista y esté activo (real)
  const { data: aff, error } = await supabaseAdmin
    .from("affiliates")
    .select("code,status")
    .eq("code", code)
    .eq("status", "active")
    .maybeSingle();

  if (error || !aff) return NextResponse.json({ ok: false, error: "INVALID_CODE" }, { status: 404 });

  const res = NextResponse.json({ ok: true, code });
  res.cookies.set("chido_ref", code, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return res;
}