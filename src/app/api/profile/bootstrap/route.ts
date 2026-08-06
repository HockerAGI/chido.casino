export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function deriveUsername(email: string | null | undefined, userId: string) {
  const base = String(email || "")
    .split("@")[0]
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "");
  return base.length >= 3 ? base.slice(0, 24) : `user_${userId.slice(0, 8)}`;
}

function deriveReferralCode(userId: string) {
  return `REF-${crypto
    .createHash("sha256")
    .update(userId)
    .digest("hex")
    .slice(0, 10)
    .toUpperCase()}`;
}

function adultDate(value: unknown) {
  const text = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime())) return null;
  const today = new Date();
  const cutoff = new Date(
    Date.UTC(
      today.getUTCFullYear() - 18,
      today.getUTCMonth(),
      today.getUTCDate()
    )
  );
  return date <= cutoff ? text : null;
}

function acceptedAt(value: unknown) {
  const text = String(value || "").trim();
  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.id) {
      return NextResponse.json(
        { ok: false, error: "NO_AUTH" },
        { status: 401 }
      );
    }

    const metadata = (user.user_metadata || {}) as Record<string, unknown>;
    const dateOfBirth = adultDate(metadata.date_of_birth);
    const ageDeclaredAt = acceptedAt(metadata.age_declared_at);
    const termsAcceptedAt = acceptedAt(metadata.terms_accepted_at);
    const privacyAcceptedAt = acceptedAt(metadata.privacy_accepted_at);

    if (!dateOfBirth) {
      return NextResponse.json(
        { ok: false, error: "ADULT_DATE_OF_BIRTH_REQUIRED" },
        { status: 403 }
      );
    }
    if (!termsAcceptedAt || !privacyAcceptedAt) {
      return NextResponse.json(
        { ok: false, error: "LEGAL_CONSENT_REQUIRED" },
        { status: 403 }
      );
    }

    const userId = user.id;
    const email = user.email ?? null;
    const now = new Date().toISOString();
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: userId,
          user_id: userId,
          email,
          username: deriveUsername(email, userId),
          role: "user",
          kyc_status: "unverified",
          date_of_birth: dateOfBirth,
          age_declared_at: ageDeclaredAt || now,
          terms_accepted_at: termsAcceptedAt,
          privacy_accepted_at: privacyAcceptedAt,
          referral_code: deriveReferralCode(userId),
          updated_at: now,
        } as any,
        {
          onConflict: "user_id",
          ignoreDuplicates: false,
        }
      )
      .select(
        "id,user_id,email,username,avatar_url,role,vip_level,kyc_status,xp,referral_code,free_spins,date_of_birth,age_declared_at,age_verified_at,terms_accepted_at,privacy_accepted_at,created_at,updated_at"
      )
      .single();

    if (error) {
      console.error("Profile bootstrap failed", error);
      return NextResponse.json(
        { ok: false, error: "BOOTSTRAP_FAILED" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    console.error("Profile bootstrap error", error);
    return NextResponse.json(
      { ok: false, error: "BOOTSTRAP_FAILED" },
      { status: 500 }
    );
  }
}
