import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyWebhookHmac } from "@/lib/astropay";

function tierRateFromDeposit(amount: number) {
  if (amount >= 500) return 0.05;
  if (amount >= 300) return 0.03;
  return 0.01;
}

export async function POST(req: Request) {
  const raw = await req.text();

  const sig = req.headers.get("x-signature") || req.headers.get("x-astropay-signature");
  const v = verifyWebhookHmac(raw, sig);
  if (!v.ok && v.enforced) {
    return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 401 });
  }

  let body: any = null;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const externalId =
    body?.external_id ||
    body?.merchant_reference ||
    body?.reference ||
    body?.data?.external_id ||
    body?.data?.merchant_reference ||
    null;

  const providerReference =
    body?.id ||
    body?.payment_id ||
    body?.transaction_id ||
    body?.reference ||
    body?.data?.id ||
    body?.data?.payment_id ||
    body?.data?.transaction_id ||
    null;

  const statusRaw = String(body?.status || body?.data?.status || "").toLowerCase();
  const success = ["paid", "approved", "completed", "successful", "success"].includes(statusRaw);
  const failed = ["failed", "cancelled", "canceled", "rejected", "error"].includes(statusRaw);

  if (!externalId && !providerReference) {
    return NextResponse.json({ ok: true, note: "No external_id/provider_reference in webhook" });
  }

  const { data: intent, error: iErr } = await supabaseAdmin
    .from("deposit_intents")
    .select("*")
    .or(
      externalId
        ? `external_id.eq.${externalId},provider_reference.eq.${providerReference || "___"}`
        : `provider_reference.eq.${providerReference}`
    )
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (iErr) {
    console.error(iErr);
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }
  if (!intent) return NextResponse.json({ ok: true, note: "Intent not found" });

  if (intent.status === "completed" && intent.credited_at) {
    return NextResponse.json({ ok: true, idempotent: true });
  }

  if (success) {
    await supabaseAdmin
      .from("deposit_intents")
      .update({
        status: "completed",
        provider_payload: body,
        credited_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", intent.id);

    const ref = String(intent.external_id || intent.provider_reference || intent.id);

    const { error: wErr } = await supabaseAdmin.rpc("wallet_apply_delta", {
      p_user_id: intent.user_id,
      p_delta_balance: Number(intent.amount),
      p_delta_bonus: 0,
      p_delta_locked: 0,
      p_reason: "deposit_completed",
      p_ref_id: ref,
      p_metadata: { provider: "astropay", method: intent.method },
    });

    if (wErr) {
      console.error(wErr);
      return NextResponse.json({ error: "WALLET_APPLY_FAILED" }, { status: 500 });
    }

    const rate = tierRateFromDeposit(Number(intent.amount));
    await supabaseAdmin
      .from("profiles")
      .update({
        cashback_rate: rate,
        last_deposit_amount: Number(intent.amount),
        last_deposit_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", intent.user_id);

    return NextResponse.json({ ok: true, credited: true, cashback_rate: rate });
  }

  if (failed) {
    await supabaseAdmin
      .from("deposit_intents")
      .update({
        status: "failed",
        provider_payload: body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", intent.id);

    return NextResponse.json({ ok: true, failed: true });
  }

  await supabaseAdmin
    .from("deposit_intents")
    .update({
      provider_payload: body,
      updated_at: new Date().toISOString(),
    })
    .eq("id", intent.id);

  return NextResponse.json({ ok: true, received: true });
}