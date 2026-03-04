export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { walletApplyDelta } from "@/lib/walletApplyDelta";

function isSchemaMismatch(msg: string) {
  const m = (msg || "").toLowerCase();
  return m.includes("column") || m.includes("does not exist") || m.includes("unknown");
}

type Action = "paid" | "reject" | "failed" | "refund";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("x-admin-token") || "";
    const expected = process.env.ADMIN_API_TOKEN || "";
    if (!expected || token !== expected) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as {
      externalId?: string;
      action?: Action;
      providerPayload?: any;
      note?: string;
    };

    const externalId = String(body.externalId || "").trim();
    const action = (String(body.action || "") as Action) || "paid";

    if (!externalId) {
      return NextResponse.json({ ok: false, error: "externalId requerido" }, { status: 400 });
    }
    if (!["paid", "reject", "failed", "refund"].includes(action)) {
      return NextResponse.json({ ok: false, error: "action inválida" }, { status: 400 });
    }

    // =========================================================
    // Fetch request (schema new -> fallback legacy)
    // ✅ FIX TS strict: NO reasignamos responses tipados con selects distintos.
    // =========================================================
    let row: any | null = null;

    const reqNew = await supabaseAdmin
      .from("withdraw_requests")
      .select("user_id, amount, status, external_id")
      .eq("external_id", externalId)
      .maybeSingle();

    if (!reqNew.error && reqNew.data) {
      row = reqNew.data as any;
    } else if (reqNew.error && isSchemaMismatch(String(reqNew.error.message || ""))) {
      const reqLegacy = await supabaseAdmin
        .from("withdraw_requests")
        .select("user_id, amount, status, id")
        .eq("id", externalId)
        .maybeSingle();

      if (reqLegacy.error) {
        return NextResponse.json({ ok: false, error: reqLegacy.error.message }, { status: 500 });
      }
      row = (reqLegacy.data as any) || null;
    } else if (reqNew.error) {
      return NextResponse.json({ ok: false, error: reqNew.error.message }, { status: 500 });
    }

    if (!row) {
      return NextResponse.json({ ok: false, error: "No encontrado" }, { status: 404 });
    }

    const userId = String(row.user_id || "");
    const amount = Number(row.amount || 0);
    const status = String(row.status || "pending");

    if (!userId || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ ok: false, error: "Registro inválido" }, { status: 500 });
    }

    // idempotencia
    if (["paid", "rejected", "failed", "refunded"].includes(status)) {
      return NextResponse.json({ ok: true, status, alreadyFinal: true });
    }

    const finalStatus =
      action === "paid"
        ? "paid"
        : action === "reject"
          ? "rejected"
          : action === "failed"
            ? "failed"
            : "refunded";

    // =========================================================
    // Update request (schema new -> fallback legacy)
    // =========================================================
    const upNew = await supabaseAdmin
      .from("withdraw_requests")
      .update({
        status: finalStatus,
        provider_payload: body.providerPayload ?? null,
      } as any)
      .eq("external_id", externalId);

    if (upNew.error && isSchemaMismatch(String(upNew.error.message || ""))) {
      const upLegacy = await supabaseAdmin
        .from("withdraw_requests")
        .update({
          status: finalStatus,
          metadata: { provider_payload: body.providerPayload ?? null, note: body.note ?? null },
        } as any)
        .eq("id", externalId);

      if (upLegacy.error) {
        return NextResponse.json({ ok: false, error: upLegacy.error.message }, { status: 500 });
      }
    } else if (upNew.error) {
      return NextResponse.json({ ok: false, error: upNew.error.message }, { status: 500 });
    }

    // =========================================================
    // Wallet settle
    // =========================================================
    if (action === "paid") {
      const r = await walletApplyDelta(supabaseAdmin, {
        userId,
        deltaBalance: 0,
        deltaBonus: 0,
        deltaLocked: -amount,
        reason: "withdraw_paid",
        refId: `${externalId}:paid`,
        metadata: { note: body.note ?? null },
      });
      if (r.error) return NextResponse.json({ ok: false, error: r.error }, { status: 500 });
    } else {
      const r = await walletApplyDelta(supabaseAdmin, {
        userId,
        deltaBalance: +amount,
        deltaBonus: 0,
        deltaLocked: -amount,
        reason: "withdraw_refund",
        refId: `${externalId}:${finalStatus}`,
        metadata: { note: body.note ?? null },
      });
      if (r.error) return NextResponse.json({ ok: false, error: r.error }, { status: 500 });
    }

    return NextResponse.json({ ok: true, status: finalStatus });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error interno" }, { status: 500 });
  }
}