export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auditAdminAction, requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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
  const a = await supabaseAdmin.rpc("admin_reject_manual_deposit", {
    p_folio: folio,
    p_ref_id: folio,
    p_note: note ?? null,
  } as any);
  if (!a.error) return a;
  if (!isArgMismatch(String(a.error.message || ""))) return a;

  return supabaseAdmin.rpc("admin_reject_manual_deposit", {
    folio,
    ref_id: folio,
    note: note ?? null,
  } as any);
}

export async function POST(req: Request) {
  const auth = await requireAdmin(req, "payments:write");
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({} as any));
  const folio = String(body?.folio || "").trim();
  const note = String(body?.note || "").trim() || null;

  if (!folio) return NextResponse.json({ ok: false, error: "Folio requerido" }, { status: 400 });

  const rpc = await rejectManualDepositRPC(folio, note);
  if (!rpc.error) {
    await auditAdminAction(auth.admin, "admin_reject_manual_deposit", { folio, note, mode: "rpc" });
    return NextResponse.json({ ok: true, mode: "rpc", data: rpc.data ?? { ok: true } });
  }

  const up = await supabaseAdmin
    .from("manual_deposit_requests")
    .update({ status: "rejected" } as any)
    .eq("folio", folio)
    .eq("status", "pending");

  if (up.error) {
    return NextResponse.json({ ok: false, error: rpc.error.message, fallbackError: up.error.message }, { status: 500 });
  }

  await auditAdminAction(auth.admin, "admin_reject_manual_deposit", { folio, note, mode: "fallback" });
  return NextResponse.json({ ok: true, mode: "fallback", folio, status: "rejected" });
}
