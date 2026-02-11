export const runtime = "nodejs";

import { NextResponse } from "next/server";
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
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    });
  } catch {
    // no truena si Telegram está vacío o falla
  }
}

async function confirmManualDeposit(folio: string, amount?: number | null) {
  const refId = folio;

  // intento 1: params “modernos”
  const a = await supabaseAdmin.rpc("admin_confirm_manual_deposit", {
    p_folio: folio,
    p_amount: amount ?? null,
    p_ref_id: refId,
  } as any);

  if (!a.error) return a;

  const msgA = String(a.error?.message || "");
  if (!isArgMismatch(msgA)) return a;

  // intento 2: params alternos
  const b = await supabaseAdmin.rpc("admin_confirm_manual_deposit", {
    folio,
    amount: amount ?? null,
    ref_id: refId,
  } as any);

  if (!b.error) return b;

  const msgB = String(b.error?.message || "");
  if (!isArgMismatch(msgB)) return b;

  // intento 3: legacy p_method
  const c = await supabaseAdmin.rpc("admin_confirm_manual_deposit", {
    p_folio: folio,
    p_amount: amount ?? null,
    p_method: refId,
  } as any);

  return c;
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get("x-admin-token") || "";
    const expected = process.env.ADMIN_API_TOKEN || "";
    if (!expected || token !== expected) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

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

    if (data?.ok) {
      await notifyTelegram(
        `✅ CHIDO — Depósito manual aprobado\nFolio: ${folio}\nMonto: ${data.amount ?? "?"} MXN\nUsuario: ${data.user_id ?? "?"}`
      );
    }

    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error interno" }, { status: 500 });
  }
}