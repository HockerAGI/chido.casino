export const runtime = "nodejs";

import crypto from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function sha256hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function GET(req: Request, { params }: { params: { code: string } }) {
  const code = String(params.code || "").trim().toUpperCase();
  if (!code) return NextResponse.redirect(new URL("/", req.url));

  const { data: aff, error } = await supabaseAdmin
    .from("affiliates")
    .select("user_id, code, status")
    .eq("code", code)
    .eq("status", "active")
    .maybeSingle();

  if (error || !aff) return NextResponse.redirect(new URL("/", req.url));

  // IP hash (no guardamos IP real)
  const salt = process.env.AFFILIATE_IP_SALT || "";
  const xf = req.headers.get("x-forwarded-for") || "";
  const ip = xf.split(",")[0].trim();
  const ip_hash = ip && salt ? sha256hex(`${ip}:${salt}`) : null;

  const user_agent = req.headers.get("user-agent");
  const referer = req.headers.get("referer");

  // Best-effort: log click
  await supabaseAdmin.from("affiliate_clicks").insert({
    affiliate_user_id: aff.user_id,
    code: aff.code,
    ip_hash,
    user_agent,
    referer,
  });

  const res = NextResponse.redirect(new URL(`/signup?ref=${encodeURIComponent(aff.code)}`, req.url));
  res.cookies.set("chido_ref", aff.code, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30, // 30 días
    path: "/",
  });

  return res;
}