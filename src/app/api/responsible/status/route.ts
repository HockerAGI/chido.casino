export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSelfExclusionState } from "@/lib/responsibleGaming";

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const exclusion = await getSelfExclusionState(
    supabaseAdmin as any,
    session.user.id
  );
  if (!exclusion.ok) {
    console.error("Responsible status lookup failed", exclusion.error);
    return NextResponse.json(
      { ok: false, error: "RESPONSIBLE_GAMING_CHECK_FAILED" },
      { status: 503 }
    );
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("kyc_status")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    console.error("Responsible KYC status lookup failed", profileError);
    return NextResponse.json(
      { ok: false, error: "KYC_CHECK_FAILED" },
      { status: 503 }
    );
  }

  return NextResponse.json({
    ok: true,
    excluded: exclusion.excluded,
    until: exclusion.excluded ? exclusion.until : null,
    reason: exclusion.excluded ? exclusion.reason ?? null : null,
    kyc_status: profile.kyc_status ?? null,
  });
}
