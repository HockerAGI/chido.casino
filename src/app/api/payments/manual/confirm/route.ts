import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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
    // no truena si Telegram está vacío
  }
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

    // RPC ya existe (lo creaste con el SQL patch)
    const { data, error } = await supabaseAdmin.rpc("admin_confirm_manual_deposit", {
      p_folio: folio,
      p_amount: body.amount ?? null,
      p_ref_id: folio,
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (data?.ok) {
      await notifyTelegram(
        `✅ CHIDO — Depósito manual aprobado\nFolio: ${folio}\nMonto: ${data.amount} MXN\nUsuario: ${data.user_id}`
      );
    }

    return NextResponse.json(data ?? { ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error interno" }, { status: 500 });
  }
}