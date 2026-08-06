import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { loginRateKey, normalizedLoginEmail } from "@/lib/loginRateKey";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req
    .json()
    .catch(() => ({} as Record<string, unknown>));
  const email = normalizedLoginEmail(body.email);
  if (!email) {
    return NextResponse.json(
      { ok: false, error: "VALID_EMAIL_REQUIRED" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin.rpc("consume_rate_limit", {
    p_key: loginRateKey(req, email),
    p_max_hits: 6,
    p_window_seconds: 600,
  });

  if (error || !data || typeof data !== "object") {
    console.error("Login rate limiter unavailable", error);
    return NextResponse.json(
      { ok: false, error: "RATE_LIMIT_UNAVAILABLE" },
      { status: 503 }
    );
  }

  const result = data as Record<string, unknown>;
  const allowed = result.allowed === true;
  const hits = Number(result.hits || 0);
  const resetAt = String(result.reset_at || "");
  const resetMs = Date.parse(resetAt);
  const cooldownSeconds = Number.isFinite(resetMs)
    ? Math.max(0, Math.ceil((resetMs - Date.now()) / 1000))
    : 600;

  if (!allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: "RATE_LIMIT_EXCEEDED",
        risk: 95,
        cooldownSeconds,
      },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(cooldownSeconds),
        },
      }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      risk: hits <= 3 ? 15 : 55,
      remaining: Number(result.remaining || 0),
      cooldownSeconds: 0,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
