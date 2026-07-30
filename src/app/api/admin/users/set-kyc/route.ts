export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auditAdminAction, requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const auth = await requireAdmin(req, "kyc:write");
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({} as any));
  const userId = String(body?.userId || "").trim();
  const kyc_status = String(body?.kyc_status || "").trim();

  if (!userId) {
    return NextResponse.json({ ok: false, error: "Falta el userId" }, { status: 400 });
  }
  if (!kyc_status) {
    return NextResponse.json({ ok: false, error: "Falta el kyc_status" }, { status: 400 });
  }

  const up = await supabaseAdmin.from("profiles").update({ kyc_status }).eq("user_id", userId);
  if (up.error) {
    return NextResponse.json({ ok: false, error: up.error.message }, { status: 500 });
  }

  await auditAdminAction(auth.admin, "admin_set_kyc", { user_id: userId, kyc_status });

  return NextResponse.json({ ok: true, userId, kyc_status });
}
