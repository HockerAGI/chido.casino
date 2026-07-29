export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auditAdminAction, requireAdmin } from "@/lib/adminAuth";
import { applyPromoForDeposit } from "@/lib/applyPromoForDeposit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function isArgMismatch(msg: string) {
  const m = msg.toLowerCase();
  return (
    m.includes("named argument") ||
    m.includes("does not exist") ||
    m.includes("unknown") ||
    m.includes("p_folio") ||
    m.includes("p_amount") ||
    m.includes("p_ref_id") ||
    m.includes("p_method")
  );
}

async function notifyTelegram(text: string) {
  const bot = process.env.TELEGRAM_BOT_TOKEN || "";
  const chatId = process.env.TELEGRAM_SUPPORT_CHAT_ID || "";
  if (!bot || !chatId) return;

  try {
    await fetch(`https://api.telegram.org/bot${bot}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
  } catch {
    // Telegram is best effort.
  }
}

async function confirmManualDeposit(folio: string, amount?: number | null) {
  const refId = folio;

  const a = await supabaseAdmin.rpc("admin_confirm_manual_deposit", {
    p_folio: folio,
    p_amount: amount ?? null,
    p_ref_id: refId,
  } as any);
  if (!a.error) return a;
  if (!isArgMismatch(String(a.error?.message || ""))) return a;

  const b = await supabaseAdmin.rpc("admin_confirm_manual_deposit", {
    folio,
    amount: amount ?? null,
    ref_id: refId,
  } as any);
  if (!b.error) return b;
  if (!isArgMismatch(String(b.error?.message || ""))) return b;

  return supabaseAdmin.rpc("admin_confirm_manual_deposit", {
    p_folio: folio,
    p_amount: amount ?? null,
    p_method: refId,
  } as any);
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin(req, "payments:write");
    if (!auth.ok) return auth.response;

    const body = (await req.json()) as { folio?: string; amount?: number };
    const folio = String(body.folio || "").trim();

    if (!folio) {
      return NextResponse.json({ ok: false, error: "Folio requerido" }, { status: 400 });
    }

    const res = await confirmManualDeposit(folio, body.amount ?? null);
    if (res.error) {
      return NextResponse.json({ ok: false, error: res.error.message }, { status: 500 });
    }

    const data = res.data ?? { ok: true };

    try {
      if (data?.ok && data?.user_id && data?.amount) {
        const amount = Number(data.amount);
        const depositRef = String(data.deposit_id || data.id || folio);

        if (Number.isFinite(amount) && amount > 0) {
          data.promo = await applyPromoForDeposit(supabaseAdmin, {
            userId: data.user_id,
            depositAmount: amount,
            depositRef,
          });
        }
      }
    } catch {
      // Promo is best effort.
    }

    await auditAdminAction(auth.admin, "admin_confirm_manual_deposit", {
      folio,
      amount: body.amount ?? null,
      result: data?.ok ? "ok" : "unknown",
    });

    if (data?.ok) {
      await notifyTelegram(
        `CHIDO - Deposito manual aprobado\nFolio: ${folio}\nMonto: ${data.amount ?? "?"} MXN\nUsuario: ${
          data.user_id ?? "?"
        }`
      );
    }

    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error interno" }, { status: 500 });
  }
}
