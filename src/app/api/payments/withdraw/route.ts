export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { walletApplyDelta } from "@/lib/walletApplyDelta";
import { getSelfExclusionState } from "@/lib/responsibleGaming";
import { fraudLog, velocityLimit } from "@/lib/fraud";

function isValidClabe(clabe: string) {
  return /^[0-9]{18}$/.test(clabe);
}
function isSchemaMismatch(msg: string) {
  const m = (msg || "").toLowerCase();
  return m.includes("column") || m.includes("does not exist") || m.includes("unknown") || m.includes("named argument");
}
function isInsufficient(msg: string) {
  const m = (msg || "").toLowerCase();
  return m.includes("insufficient") || m.includes("saldo") || m.includes("balance") || m.includes("not enough");
}

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    // ✅ Autoexclusión: permite retirar? (muchas plataformas sí), pero NO permite iniciar retiros nuevos.
    // Aquí lo bloqueamos para no abrir loops operativos durante autoexclusión.
    const ex = await getSelfExclusionState(supabaseAdmin as any, session.user.id);
    if (ex.ok && ex.excluded) {
      return NextResponse.json(
        { error: "SELF_EXCLUDED", message: "Autoexclusión activa. No puedes solicitar retiros por ahora.", until: ex.until },
        { status: 403 }
      );
    }

    // ✅ Anti-spam retiros: 3 en 24h
    const lim = await velocityLimit(supabaseAdmin as any, "withdraw_requests", {
      userId: session.user.id,
      minutes: 24 * 60,
      max: 3,
    });
    if (!lim.ok) return NextResponse.json({ error: "RATE_LIMIT", message: lim.error }, { status: 429 });

    const body = await req.json().catch(() => ({} as any));
    const amount = Number(body?.amount);
    const clabe = String(body?.clabe || "").trim();
    const beneficiary = String(body?.beneficiary || "").trim();

    if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
    if (!isValidClabe(clabe)) return NextResponse.json({ error: "CLABE inválida (18 dígitos)" }, { status: 400 });
    if (beneficiary.length < 3) return NextResponse.json({ error: "Beneficiario inválido" }, { status: 400 });

    // ✅ KYC gate
    const { data: p } = await supabaseAdmin
      .from("profiles")
      .select("kyc_status")
      .eq("user_id", session.user.id)
      .maybeSingle();

    const kyc = String(p?.kyc_status || "").toLowerCase();
    if (!(kyc === "approved" || kyc === "verified")) {
      return NextResponse.json({ error: "KYC_REQUIRED", message: "Necesitas KYC aprobado para retirar." }, { status: 403 });
    }

    // ✅ Promo gate (rollover)
    const { data: claim } = await supabaseAdmin
      .from("promo_claims")
      .select("id,wagering_required,wagering_progress,status")
      .eq("user_id", session.user.id)
      .eq("status", "applied")
      .order("claimed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (claim) {
      const required = Number((claim as any).wagering_required || 0);
      const progress = Number((claim as any).wagering_progress || 0);
      if (Number.isFinite(required) && required > 0 && progress < required) {
        return NextResponse.json(
          {
            error: "PROMO_WAGERING_INCOMPLETE",
            message: "Tienes un bono en rollover. Termina el requisito de apuesta antes de retirar.",
            required,
            progress,
          },
          { status: 409 }
        );
      }
    }

    const externalId = `wd_${session.user.id}_${Date.now()}`;

    // Lock funds
    const lock = await walletApplyDelta(supabaseAdmin as any, {
      userId: session.user.id,
      deltaBalance: -Number(amount),
      deltaBonus: 0,
      deltaLocked: Number(amount),
      reason: "withdraw_request",
      refId: externalId,
    });

    if (lock.error) {
      const msg = String(lock.error || "");
      if (isInsufficient(msg)) return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });
      return NextResponse.json({ error: "WALLET_ERROR" }, { status: 500 });
    }

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
      await walletApplyDelta(supabaseAdmin as any, {
        userId: session.user.id,
        deltaBalance: Number(amount),
        deltaBonus: 0,
        deltaLocked: -Number(amount),
        reason: "withdraw_rollback",
        refId: `${externalId}:rb`,
      });
      return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
    }

    await fraudLog(supabaseAdmin as any, req, {
      userId: session.user.id,
      eventType: "withdraw_requested",
      metadata: { amount, provider: "astropay" },
    });

    return NextResponse.json({ ok: true, status: "pending", externalId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error interno" }, { status: 500 });
  }
}