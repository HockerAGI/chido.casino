export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function mustAdmin(req: Request) {
  const token = req.headers.get("x-admin-token") || "";
  const expected = process.env.ADMIN_API_TOKEN || "";
  return Boolean(expected && token === expected);
}
function isMissingTable(msg: string) {
  const m = (msg || "").toLowerCase();
  return m.includes("relation") && m.includes("does not exist");
}

async function bestEffortAudit(payload: any) {
  try {
    // Si existe transactions_audit (tu schema.sql la hardenea), intentamos registrar.
    const ins = await supabaseAdmin.from("transactions_audit").insert(payload as any);
    if (ins.error && isMissingTable(String(ins.error.message || ""))) return;
  } catch {
    // silencioso: no rompemos admin por falta de tabla
  }
}

export async function POST(req: Request) {
  if (!mustAdmin(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const userId = String(body?.userId || "").trim();
  const kyc_status = String(body?.kyc_status || "").trim();

  if (!userId) return NextResponse.json({ ok: false, error: "userId requerido" }, { status: 400 });
  if (!kyc_status) return NextResponse.json({ ok: false, error: "kyc_status requerido" }, { status: 400 });

  const up = await supabaseAdmin.from("profiles").update({ kyc_status }).eq("user_id", userId);
  if (up.error) return NextResponse.json({ ok: false, error: up.error.message }, { status: 500 });

  await bestEffortAudit({
    user_id: userId,
    action: "admin_set_kyc",
    metadata: { kyc_status },
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, userId, kyc_status });
}