import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.headers.append(
    "Set-Cookie",
    `chido_risk=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`
  );
  return res;
}