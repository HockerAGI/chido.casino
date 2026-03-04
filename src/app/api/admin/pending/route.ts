export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function mustAdmin(req: Request) {
  const token = req.headers.get("x-admin-token") || "";
  const expected = process.env.ADMIN_API_TOKEN || "";
  return Boolean(expected && token === expected);
}

function isSchemaMismatch(msg: string) {
  const m = msg.toLowerCase();
  return m.includes("column") || m.includes("does not exist") || m.includes("unknown");
}

export async function GET(req: Request) {
  if (!mustAdmin(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  // Depósitos manuales pendientes
  const deposits = await supabaseAdmin
    .from("manual_deposit_requests")
    .select("id,folio,user_id,amount,currency,status,created_at,instructions")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(100);

  // Retiros pendientes (best-effort schema)
  let withdraws = await supabaseAdmin
    .from("withdraw_requests")
    .select("external_id,user_id,amount,currency,status,created_at,clabe,beneficiary,provider")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(100);

  if (withdraws.error && isSchemaMismatch(String(withdraws.error.message || ""))) {
    withdraws = await supabaseAdmin
      .from("withdraw_requests")
      .select("id,user_id,amount,currency,status,created_at,method,destination,metadata")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(100);
  }

  return NextResponse.json({
    ok: true,
    deposits: deposits.data || [],
    withdraws: withdraws.data || [],
  });
}