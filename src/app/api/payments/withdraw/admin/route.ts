export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Action = "paid" | "reject" | "failed" | "refund";

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin(req, "payments:write");
    if (!auth.ok) return auth.response;

    const body = (await req.json().catch(() => ({}))) as {
      externalId?: string;
      action?: Action;
      providerPayload?: Record<string, unknown>;
      note?: string;
      idempotencyKey?: string;
    };

    const externalId = String(body.externalId || "").trim();
    const action = String(body.action || "") as Action;
    const note = String(body.note || "").trim();

    if (!externalId) {
      return NextResponse.json(
        { ok: false, error: "EXTERNAL_ID_REQUIRED" },
        { status: 400 }
      );
    }
    if (!["paid", "reject", "failed", "refund"].includes(action)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_ACTION" },
        { status: 400 }
      );
    }
    if (note.length < 3) {
      return NextResponse.json(
        { ok: false, error: "SETTLEMENT_NOTE_REQUIRED" },
        { status: 400 }
      );
    }

    const idempotencyKey =
      String(
        body.idempotencyKey ||
          req.headers.get("idempotency-key") ||
          ""
      ).trim() || `withdraw_settle:${externalId}:${action}`;

    const { data, error } = await supabaseAdmin.rpc(
      "admin_settle_withdrawal_audited",
      {
        p_external_id: externalId,
        p_final_action: action,
        p_provider_payload:
          body.providerPayload && typeof body.providerPayload === "object"
            ? body.providerPayload
            : {},
        p_note: note,
        p_idempotency_key: idempotencyKey,
        p_actor_id: auth.admin.userId,
        p_actor_email: auth.admin.email || null,
      }
    );

    if (error) {
      console.error("Atomic withdrawal settlement failed", error);
      return NextResponse.json(
        { ok: false, error: "ATOMIC_SETTLEMENT_FAILED" },
        { status: 500 }
      );
    }

    const result = (data || {}) as Record<string, any>;
    if (!result.ok || result.audit_recorded !== true) {
      const code = String(result.error || "SETTLEMENT_REJECTED");
      const statusCode =
        code === "NOT_FOUND"
          ? 404
          : code.includes("INVALID")
            ? 400
            : 409;
      return NextResponse.json(
        { ok: false, error: code, details: result },
        { status: statusCode }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Withdrawal settlement error", error);
    return NextResponse.json(
      { ok: false, error: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
