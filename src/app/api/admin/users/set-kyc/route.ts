export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auditAdminAction, requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const KYC_STATUSES = new Set([
  "unverified",
  "pending",
  "review_required",
  "approved",
  "rejected",
]);

export async function POST(req: Request) {
  const auth = await requireAdmin(req, "kyc:write");
  if (!auth.ok) return auth.response;

  const body = await req
    .json()
    .catch(() => ({} as Record<string, unknown>));
  const userId = String(body?.userId || "").trim();
  const kycStatus = String(body?.kyc_status || "")
    .trim()
    .toLowerCase();

  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "USER_ID_REQUIRED" },
      { status: 400 }
    );
  }
  if (!KYC_STATUSES.has(kycStatus)) {
    return NextResponse.json(
      {
        ok: false,
        error: "INVALID_KYC_STATUS",
        allowed: Array.from(KYC_STATUSES),
      },
      { status: 400 }
    );
  }

  const { data: updated, error } = await supabaseAdmin
    .from("profiles")
    .update({ kyc_status: kycStatus })
    .eq("user_id", userId)
    .select("user_id,kyc_status")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, error: "KYC_UPDATE_FAILED" },
      { status: 500 }
    );
  }
  if (!updated) {
    return NextResponse.json(
      { ok: false, error: "USER_NOT_FOUND" },
      { status: 404 }
    );
  }

  await auditAdminAction(auth.admin, "admin_set_kyc", {
    user_id: userId,
    kyc_status: kycStatus,
  });

  return NextResponse.json({
    ok: true,
    userId,
    kyc_status: kycStatus,
  });
}
