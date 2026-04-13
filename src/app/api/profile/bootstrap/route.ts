export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import crypto from "crypto";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function deriveUsername(email: string | null | undefined, userId: string) {
  const base = String(email || "")
    .split("@")[0]
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "");

  if (base.length >= 3) return base.slice(0, 24);

  return `user_${userId.slice(0, 8)}`;
}

function deriveReferralCode(userId: string) {
  return `REF-${crypto.createHash("sha256").update(userId).digest("hex").slice(0, 10).toUpperCase()}`;
}

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user?.id) {
      return NextResponse.json({ ok: false, error: "NO_AUTH" }, { status: 401 });
    }

    const userId = session.user.id;
    const email = session.user.email ?? null;

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("profiles")
      .select("id,user_id,email,username,avatar_url,role,vip_level,kyc_status,xp,referral_code,free_spins,created_at,updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ ok: false, error: existingError.message }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({ ok: true, created: false, profile: existing });
    }

    const payload = {
      user_id: userId,
      email,
      username: deriveUsername(email, userId),
      avatar_url: null,
      role: "user",
      vip_level: null,
      kyc_status: "pending",
      xp: 0,
      referral_code: deriveReferralCode(userId),
      free_spins: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: created, error: createError } = await supabaseAdmin
      .from("profiles")
      .upsert(payload, { onConflict: "user_id" })
      .select("*")
      .single();

    if (createError) {
      return NextResponse.json({ ok: false, error: createError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, created: true, profile: created });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "BOOTSTRAP_FAILED" }, { status: 500 });
  }
}