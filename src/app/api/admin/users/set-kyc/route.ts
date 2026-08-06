export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const DECISIONS = new Set(["approved", "rejected", "review_required"]);

function parseDate(value: unknown) {
  const text = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime())) return null;
  return text;
}

export async function POST(req: Request) {
  const auth = await requireAdmin(req, "kyc:write");
  if (!auth.ok) return auth.response;

  const body = await req
    .json()
    .catch(() => ({} as Record<string, unknown>));
  const requestId = String(body.kyc_request_id || body.requestId || "").trim();
  const decision = String(body.decision || body.kyc_status || "")
    .trim()
    .toLowerCase();
  const reason = String(body.reason || body.review_note || "").trim();
  const verifiedDateOfBirth = parseDate(body.verified_date_of_birth);

  if (!requestId) {
    return NextResponse.json(
      { ok: false, error: "KYC_REQUEST_ID_REQUIRED" },
      { status: 400 }
    );
  }
  if (!DECISIONS.has(decision)) {
    return NextResponse.json(
      {
        ok: false,
        error: "INVALID_KYC_DECISION",
        allowed: Array.from(DECISIONS),
      },
      { status: 400 }
    );
  }
  if (reason.length < 3) {
    return NextResponse.json(
      { ok: false, error: "KYC_REASON_REQUIRED" },
      { status: 400 }
    );
  }
  if (decision === "approved" && !verifiedDateOfBirth) {
    return NextResponse.json(
      { ok: false, error: "VERIFIED_DATE_OF_BIRTH_REQUIRED" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin.rpc("review_kyc_request", {
    p_request_id: requestId,
    p_admin_id: auth.admin.userId,
    p_decision: decision,
    p_reason: reason,
    p_verified_date_of_birth:
      decision === "approved" ? verifiedDateOfBirth : null,
  });

  if (error) {
    const message = error.message || "";
    const status = message.includes("NOT_FOUND")
      ? 404
      : message.includes("NOT_REVIEWABLE")
        ? 409
        : message.includes("ADULT") || message.includes("DOCUMENTS")
          ? 422
          : 500;
    return NextResponse.json(
      {
        ok: false,
        error:
          status === 500 ? "KYC_REVIEW_FAILED" : message.split(":")[0],
      },
      { status }
    );
  }

  return NextResponse.json({ ok: true, review: data });
}
