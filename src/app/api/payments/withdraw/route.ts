export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { walletApplyDelta } from "@/lib/walletApplyDelta";

function isValidClabe(clabe: string) {
  return /^[0-9]{18}$/.test(clabe);
}

function isSchemaMismatch(msg: string) {
  const m = msg.toLowerCase();
  return (
    m.includes("column") ||
    m.includes("does not exist") ||
    m.includes("unknown") ||
    m.includes("named argument")
  );
}

function isInsufficient(msg: string) {
  const m = msg.toLowerCase();
  return m.includes("insufficient") || m.includes("saldo") || m.includes("balance");
}

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const amount = Number(body?.amount);
    const clabe = String(body?.clabe || "").trim();
    const beneficiary = String(body?.beneficiary || "").trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
    }
    if (!isValidClabe(clabe)) {
      return NextResponse.json({ error: "CLABE inválida (18 dígitos)" }, { status: 400 });
    }
    if (beneficiary.length < 3) {
      return NextResponse.json({ error: "Beneficiario inválido" }, { status: 400 });
    }

    // KYC gate
    const { data: p, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("kyc_status")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (pErr) console.error("profiles kyc_status error:", pErr);

    const kyc = String(p?.kyc_status || "").toLowerCase();
    if (!(kyc === "approved" || kyc === "verified")) {
      return NextResponse.json({ error: "KYC_REQUIRED" }, { status: 403 });
    }

    const externalId = `wd_${session.user.id}_${Date.now()}`;

    // 1) Lock funds
    const lock = await walletApplyDelta(supabaseAdmin, {
      userId: session.user.id,
      deltaBalance: -Number(amount),
      deltaBonus: 0,
      deltaLocked: Number(amount),
      reason: "withdraw_request",
      refId: externalId,
      metadata: { clabe, beneficiary, provider: "astropay" },
    });

    if (lock.error) {
      // FIX: lock.error es string
      const msg = String(lock.error || "");
      if (isInsufficient(msg)) {
        return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });
      }
      console.error("wallet_apply_delta lock error:", lock.error);
      return NextResponse.json({ error: "WALLET_ERROR" }, { status: 500 });
    }

    // 2) Insert withdraw request
    const payloadNew = {
      user_id: session.user.id,
      amount: Number(amount),
      currency: "MXN",
      status: "pending",
      external_id: externalId,
      provider: "astropay",
      clabe,
      beneficiary,
      provider_payload: null,
    };

    let ins = await supabaseAdmin.from("withdraw_requests").insert(payloadNew);

    if (ins.error && isSchemaMismatch(String(ins.error.message || ""))) {
      // legacy fallback
      const payloadLegacy: any = {
        user_id: session.user.id,
        amount: Number(amount),
        currency: "MXN",
        status: "pending",
        method: "astropay",
        destination: clabe,
        metadata: { beneficiary, external_id: externalId, provider: "astropay" },
      };
      ins = await supabaseAdmin.from("withdraw_requests").insert(payloadLegacy);
    }

    if (ins.error) {
      console.error("withdraw_requests insert error:", ins.error);

      // rollback best-effort
      const rb = await walletApplyDelta(supabaseAdmin, {
        userId: session.user.id,
        deltaBalance: Number(amount),
        deltaBonus: 0,
        deltaLocked: -Number(amount),
        reason: "withdraw_rollback",
        refId: `${externalId}:rb`,
        metadata: { why: "insert_failed" },
      });
      if (rb.error) console.error("rollback error:", rb.error);

      return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, status: "pending", externalId });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Error interno" }, { status: 500 });
  }
}