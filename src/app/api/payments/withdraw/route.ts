export const runtime = "nodejs";

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { fraudLog, velocityLimit } from "@/lib/fraud";

function isValidClabe(clabe: string) {
  return /^[0-9]{18}$/.test(clabe);
}

function safeRequestKey(value: unknown) {
  const candidate = String(value || "").trim();
  return /^[a-zA-Z0-9:_-]{8,128}$/.test(candidate) ? candidate : randomUUID();
}

function isInsufficient(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("insufficient") || normalized.includes("saldo") || normalized.includes("balance");
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    // Autoexclusión bloquea juego y depósitos, no el retiro de fondos legítimos.
    const limit = await velocityLimit(supabaseAdmin as any, "withdraw_requests", {
      userId: session.user.id,
      minutes: 24 * 60,
      max: 3,
    });
    if (!limit.ok) {
      return NextResponse.json({ error: "RATE_LIMIT", message: limit.error }, { status: 429 });
    }

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const amount = Number(body?.amount);
    const clabe = String(body?.clabe || "").trim();
    const beneficiary = String(body?.beneficiary || "").trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "INVALID_AMOUNT" }, { status: 400 });
    }
    if (!isValidClabe(clabe)) {
      return NextResponse.json({ error: "INVALID_CLABE" }, { status: 400 });
    }
    if (beneficiary.length < 3 || beneficiary.length > 120) {
      return NextResponse.json({ error: "INVALID_BENEFICIARY" }, { status: 400 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("kyc_status")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (profileError) {
      console.error("Withdrawal KYC lookup failed", profileError);
      return NextResponse.json({ error: "KYC_LOOKUP_FAILED" }, { status: 500 });
    }

    const kyc = String(profile?.kyc_status || "").toLowerCase();
    if (!new Set(["approved", "verified"]).has(kyc)) {
      return NextResponse.json({ error: "KYC_REQUIRED" }, { status: 403 });
    }

    const { data: claim, error: claimError } = await supabaseAdmin
      .from("promo_claims")
      .select("id,wagering_required,wagering_progress,status")
      .eq("user_id", session.user.id)
      .eq("status", "applied")
      .order("claimed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (claimError) {
      console.error("Withdrawal promo lookup failed", claimError);
      return NextResponse.json({ error: "PROMO_LOOKUP_FAILED" }, { status: 500 });
    }

    if (claim) {
      const required = Number(claim.wagering_required || 0);
      const progress = Number(claim.wagering_progress || 0);
      if (required > 0 && progress < required) {
        return NextResponse.json(
          { error: "PROMO_WAGERING_INCOMPLETE", required, progress },
          { status: 409 }
        );
      }
    }

    const { data: streakProfile } = await supabaseAdmin
      .from("profiles")
      .select("wager_required,wager_progress")
      .eq("user_id", session.user.id)
      .maybeSingle();
    const streakRequired = Number(streakProfile?.wager_required || 0);
    const streakProgress = Number(streakProfile?.wager_progress || 0);
    if (streakRequired > streakProgress) {
      return NextResponse.json(
        { error: "STREAK_WAGERING_INCOMPLETE", required: streakRequired, progress: streakProgress },
        { status: 409 }
      );
    }

    const requestKey = safeRequestKey(req.headers.get("idempotency-key") || body?.requestId);
    const externalId = `wd_${session.user.id}_${requestKey}`;
    const configuredProvider = String(process.env.DEFAULT_PAYOUT_PROVIDER || "mercadopago").toLowerCase();
    const provider = configuredProvider === "manual" ? "manual" : "mercadopago";

    const { data, error } = await supabaseAdmin.rpc("create_withdrawal_request_atomic", {
      p_user_id: session.user.id,
      p_amount: amount,
      p_external_id: externalId,
      p_provider: provider,
      p_clabe: clabe,
      p_beneficiary: beneficiary,
      p_metadata: {
        request_key: requestKey,
        source: "chido.casino",
        route: "/api/payments/withdraw",
      },
    });

    if (error) {
      if (isInsufficient(error.message)) {
        return NextResponse.json({ error: "INSUFFICIENT_FUNDS" }, { status: 400 });
      }
      console.error("Atomic withdrawal request failed", error);
      return NextResponse.json({ error: "WITHDRAW_REQUEST_FAILED" }, { status: 500 });
    }

    const result = (data || {}) as Record<string, any>;
    await fraudLog(supabaseAdmin as any, req, {
      userId: session.user.id,
      eventType: "withdraw_requested",
      metadata: {
        amount,
        provider,
        external_id: externalId,
        idempotent: Boolean(result.idempotent),
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Withdrawal request error", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
