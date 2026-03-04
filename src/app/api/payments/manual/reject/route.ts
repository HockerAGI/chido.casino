export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function mustAdmin(req: Request) {
  const token = req.headers.get("x-admin-token") || "";
  const expected = process.env.ADMIN_API_TOKEN || "";
  return Boolean(expected && token === expected);
}

function isArgMismatch(msg: string) {
  const m = (msg || "").toLowerCase();
  return (
    m.includes("named argument") ||
    m.includes("does not exist") ||
    m.includes("unknown") ||
    m.includes("p_folio") ||
    m.includes("p_ref_id") ||
    m.includes("p_note")
  );
}

async function rejectManualDepositRPC(folio: string, note?: string | null) {
  // Intento 1: moderno
  const a = await supabaseAdmin.rpc("admin_reject_manual_deposit", {
    p_folio: folio,
    p_ref_id: folio,
    p_note: note ?? null,
  } as any);
  if (!a.error) return a;

  if (!isArgMismatch(String(a.error.message || ""))) return a;

  // Intento 2: alterno
  const b = await supabaseAdmin.rpc("admin_reject_manual_deposit", {
    folio,
    ref_id: folio,
    note: note ?? null,
  } as any);
  if (!b.error) return b;

  return b;
}

export async function POST(req: Request) {
  if (!mustAdmin(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const folio = String(body?.folio || "").trim();
  const note = String(body?.note || "").trim() || null;

  if (!folio) return NextResponse.json({ ok: false, error: "Folio requerido" }, { status: 400 });

  // 1) Si existe RPC, úsalo (más “correcto” si tu DB lo trae)
  const rpc = await rejectManualDepositRPC(folio, note);
  if (!rpc.error) {
    return NextResponse.json({ ok: true, mode: "rpc", data: rpc.data ?? { ok: true } });
  }

  // 2) Fallback REAL: update manual_deposit_requests.status = rejected (no inventa wallet)
  // (Solo cambia estado, porque la wallet NO fue acreditada)
  const up = await supabaseAdmin
    .from("manual_deposit_requests")
    .update({ status: "rejected" } as any)
    .eq("folio", folio)
    .eq("status", "pending");

  if (up.error) {
    return NextResponse.json({ ok: false, error: rpc.error.message, fallbackError: up.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, mode: "fallback", folio, status: "rejected" });
}