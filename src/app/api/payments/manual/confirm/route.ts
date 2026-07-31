export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auditAdminAction, requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function notifyTelegram(text: string) {
  const bot = process.env.TELEGRAM_BOT_TOKEN || "";
  const chatId = process.env.TELEGRAM_SUPPORT_CHAT_ID || "";
  if (!bot || !chatId) return;

  try {
    await fetch(`https://api.telegram.org/bot${bot}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    console.warn("Manual deposit Telegram notification failed", error);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin(req, "payments:write");
    if (!auth.ok) return auth.response;

    const body = (await req.json().catch(() => ({}))) as {
      folio?: string;
      amount?: number;
      status?: "approved" | "rejected";
      reason?: string;
    };
    const folio = String(body.folio || "").trim();
    const status = body.status === "rejected" ? "rejected" : "approved";

    if (!folio) {
      return NextResponse.json({ ok: false, error: "FOLIO_REQUIRED" }, { status: 400 });
    }
    if (body.amount !== undefined && (!Number.isFinite(body.amount) || Number(body.amount) <= 0)) {
      return NextResponse.json({ ok: false, error: "INVALID_AMOUNT" }, { status: 400 });
    }

    const refId = `manual_deposit:${folio}`;
    const { data, error } = await supabaseAdmin.rpc("admin_confirm_manual_deposit", {
      p_folio: folio,
      p_amount: body.amount ?? null,
      p_ref_id: refId,
      p_status: status,
      p_reason: String(body.reason || "").trim() || null,
      p_meta: {
        reviewed_by: auth.admin.email || auth.admin.userId || "chido-admin",
        source: "chido.casino",
        route: "/api/payments/manual/confirm",
      },
    });

    if (error) {
      console.error("Atomic manual deposit settlement failed", error);
      return NextResponse.json({ ok: false, error: "ATOMIC_SETTLEMENT_FAILED" }, { status: 500 });
    }

    const result = (data || {}) as Record<string, any>;
    if (!result.ok) {
      const code = String(result.error || "SETTLEMENT_REJECTED");
      const httpStatus = code === "NOT_FOUND" ? 404 : code.includes("INVALID") || code.includes("MISMATCH") ? 400 : 409;
      return NextResponse.json({ ok: false, error: code, details: result }, { status: httpStatus });
    }

    await auditAdminAction(auth.admin, `admin_manual_deposit_${status}`, {
      folio,
      amount: body.amount ?? result.amount ?? null,
      status: result.status,
      idempotent: Boolean(result.idempotent),
      result: "ok",
    });

    if (status === "approved" && !result.idempotent) {
      await notifyTelegram(
        `CHIDO - Depósito manual aprobado\nFolio: ${folio}\nMonto: ${result.amount ?? "?"} MXN\nUsuario: ${result.user_id ?? "?"}`
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Manual deposit confirmation error", error);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
