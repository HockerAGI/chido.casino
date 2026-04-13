import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (code) {
    return NextResponse.redirect(new URL(`/auth/callback?code=${encodeURIComponent(code)}`, url.origin));
  }

  return NextResponse.redirect(new URL("/login", url.origin));
}