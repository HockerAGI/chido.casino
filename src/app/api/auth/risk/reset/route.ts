import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { loginRateKey, normalizedLoginEmail } from "@/lib/loginRateKey";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  const email = normalizedLoginEmail(user?.email);
  if (authError || !user?.id || !email) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const { data, error } = await supabaseAdmin.rpc("reset_rate_limit", {
    p_key: loginRateKey(req, email),
  });
  if (error || data !== true) {
    console.error("Login rate reset failed", error);
    return NextResponse.json(
      { ok: false, error: "RATE_LIMIT_RESET_FAILED" },
      { status: 503 }
    );
  }

  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } }
  );
}
