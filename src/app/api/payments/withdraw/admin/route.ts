export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { walletApplyDelta } from "@/lib/walletApplyDelta";

function isSchemaMismatch(msg: string) {
  const m = msg.toLowerCase();
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

    // fetch request (new schema)
    let reqRow = await supabaseAdmin
      .from("withdraw_requests")
      .select("user_id, amount, status, external_id")
      .eq("external_id", externalId)
      .maybeSingle();

    if (reqRow.error && isSchemaMismatch(String(reqRow.error.message || ""))) {
      // legacy fallback: try id match
      reqRow = await supabaseAdmin
        .from("withdraw_requests")
        .select("user_id, amount, status, id")
        .eq("id", externalId)
        .maybeSingle();
    }

    if (reqRow.error) {
      return NextResponse.json({ ok: false, error: reqRow.error.message }, { status: 500 });
    }
    if (!reqRow.data) {
      return NextResponse.json({ ok: false, error: "No encontrado" }, { status: 404 });
    }

    const userId = String((reqRow.data as any).user_id || "");
    const amount = Number((reqRow.data as any).amount || 0);
    const status = String((reqRow.data as any).status || "pending");

    if (!userId || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ ok: false, error: "Registro inválido" }, { status: 500 });
    }

    // idempotencia simple
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

    // update row (new schema first)
    let up = await supabaseAdmin
      .from("withdraw_requests")
      .update({
        status: finalStatus,
        provider_payload: body.providerPayload ?? null,
      })
      .eq("external_id", externalId);

    if (up.error && isSchemaMismatch(String(up.error.message || ""))) {
      // legacy fallback
      up = await supabaseAdmin
        .from("withdraw_requests")
        .update({
          status: finalStatus,
          metadata: { provider_payload: body.providerPayload ?? null, note: body.note ?? null },
        } as any)
        .eq("id", externalId);
    }

    if (up.error) {
      return NextResponse.json({ ok: false, error: up.error.message }, { status: 500 });
    }

    // wallet: release lock
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
      if (r.error) return NextResponse.json({ ok: false, error: r.error.message }, { status: 500 });
    } else {
      // refund: locked ↓, balance ↑
      const r = await walletApplyDelta(supabaseAdmin, {
        userId,
        deltaBalance: +amount,
        deltaBonus: 0,
        deltaLocked: -amount,
        reason: "withdraw_refund",
        refId: `${externalId}:${finalStatus}`,
        metadata: { note: body.note ?? null },
      });
      if (r.error) return NextResponse.json({ ok: false, error: r.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, status: finalStatus });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error interno" }, { status: 500 });
  }
}