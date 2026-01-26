import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function isValidClabe(clabe: string) {
  return /^[0-9]{18}$/.test(clabe);
}

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

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

    const { data: p } = await supabaseAdmin
      .from("profiles")
      .select("kyc_status")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (p?.kyc_status !== "approved") {
      return NextResponse.json({ error: "KYC_REQUIRED" }, { status: 403 });
    }

    const externalId = `wd_${session.user.id}_${Date.now()}`;

    const { error: wErr } = await supabaseAdmin.rpc("wallet_apply_delta", {
      p_user_id: session.user.id,
      p_delta_balance: -Number(amount),
      p_delta_bonus: 0,
      p_delta_locked: 0,
      p_reason: "withdraw_request",
      p_ref_id: externalId,
      p_metadata: { clabe, beneficiary },
    });

    if (wErr) {
      const msg = String(wErr.message || "");
      if (msg.includes("INSUFFICIENT_BALANCE")) {
        return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });
      }
      console.error(wErr);
      return NextResponse.json({ error: "WALLET_ERROR" }, { status: 500 });
    }

    await supabaseAdmin.from("withdraw_requests").insert({
      user_id: session.user.id,
      amount: Number(amount),
      currency: "MXN",
      status: "pending",
      external_id: externalId,
      provider: "astropay",
      clabe,
      beneficiary,
      provider_payload: null,
    });

    return NextResponse.json({ ok: true, status: "pending", externalId });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Error interno" }, { status: 500 });
  }
}