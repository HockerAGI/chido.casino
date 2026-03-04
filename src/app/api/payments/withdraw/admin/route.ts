export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function mustAdmin(req: Request) {
  const token = req.headers.get("x-admin-token") || "";
  const expected = process.env.ADMIN_API_TOKEN || "";
  return Boolean(expected && token === expected);
}

function isSchemaMismatch(msg: string) {
  const m = (msg || "").toLowerCase();
  return m.includes("column") || m.includes("does not exist") || m.includes("unknown");
}

export async function GET(req: Request) {
  if (!mustAdmin(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // Depósitos manuales pendientes
  const depositsRes = await supabaseAdmin
    .from("manual_deposit_requests")
    .select("id,folio,user_id,amount,currency,status,created_at,instructions")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(100);

  if (depositsRes.error) {
    return NextResponse.json({ ok: false, error: depositsRes.error.message }, { status: 500 });
  }

  // Retiros pendientes
  // ✅ FIX TS strict:
  // NO reasignamos un response tipado de Supabase con un select distinto.
  // Guardamos solo "data" en una variable suelta.
  let withdrawsData: any[] = [];

  const withdrawNew = await supabaseAdmin
    .from("withdraw_requests")
    .select("external_id,user_id,amount,currency,status,created_at,clabe,beneficiary,provider")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(100);

  if (!withdrawNew.error) {
    withdrawsData = (withdrawNew.data as any[]) || [];
  } else if (isSchemaMismatch(String(withdrawNew.error.message || ""))) {
    const withdrawLegacy = await supabaseAdmin
      .from("withdraw_requests")
      .select("id,user_id,amount,currency,status,created_at,method,destination,metadata")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(100);

    if (withdrawLegacy.error) {
      return NextResponse.json({ ok: false, error: withdrawLegacy.error.message }, { status: 500 });
    }

    withdrawsData = (withdrawLegacy.data as any[]) || [];
  } else {
    return NextResponse.json({ ok: false, error: withdrawNew.error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    deposits: depositsRes.data || [],
    withdraws: withdrawsData,
  });
}