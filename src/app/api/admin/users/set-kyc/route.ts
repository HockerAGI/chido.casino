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

async function bestEffortAudit(userId: string, kycStatus: string) {
  try {
    // transactions_audit has columns: id, transaction_id, changed_by, action, payload, created_at
    // The "payload" jsonb column stores the full audit context.
    const ins = await supabaseAdmin.from("transactions_audit").insert({
      // transaction_id is nullable; we use it to reference the user being audited
      transaction_id: null,
      changed_by: "admin-api",
      action: "admin_set_kyc",
      payload: { user_id: userId, kyc_status: kycStatus, at: new Date().toISOString() },
    } as any);
    if (ins.error && isMissingTable(String(ins.error.message || ""))) return;
  } catch {
    // silencioso: no rompemos admin por falta de tabla
  }
}

export async function POST(req: Request) {
  if (!mustAdmin(req))
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const userId = String(body?.userId || "").trim();
  const kyc_status = String(body?.kyc_status || "").trim();

  if (!userId)
    return NextResponse.json({ ok: false, error: "Falta el userId" }, { status: 400 });
  if (!kyc_status)
    return NextResponse.json({ ok: false, error: "Falta el kyc_status" }, { status: 400 });

  const up = await supabaseAdmin
    .from("profiles")
    .update({ kyc_status })
    .eq("user_id", userId);
  if (up.error)
    return NextResponse.json({ ok: false, error: up.error.message }, { status: 500 });

  await bestEffortAudit(userId, kyc_status);

  return NextResponse.json({ ok: true, userId, kyc_status });
}
