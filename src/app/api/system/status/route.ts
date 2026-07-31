import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import {
  checkSupabaseTable,
  recordChidoEvent,
  upsertChidoPresence,
} from "@/lib/hocker-one-monitoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Check = {
  active: boolean;
  label: string;
  detail: string;
};

function check(label: string, active: boolean, detail: string): Check {
  return { active, label, detail };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const detailed = url.searchParams.get("detail") === "1";
  const emitEvent = url.searchParams.get("emit_event") === "1";

  if (detailed || emitEvent) {
    const auth = await requireAdmin(req, "system:read");
    if (!auth.ok) return auth.response;
  }

  const startedAt = Date.now();
  const [profilesOk, balancesOk, transactionsOk, kycOk, manualDepositsOk, withdrawalsOk] =
    await Promise.all([
      checkSupabaseTable("profiles"),
      checkSupabaseTable("balances"),
      checkSupabaseTable("transactions"),
      checkSupabaseTable("kyc_requests"),
      checkSupabaseTable("manual_deposit_requests"),
      checkSupabaseTable("withdraw_requests"),
    ]);

  const supabaseOnline = profilesOk || balancesOk || transactionsOk;
  const checks = {
    web: check("Web", true, "Online"),
    supabase: check("Supabase", supabaseOnline, supabaseOnline ? "Online" : "Unavailable"),
    wallet: check("Wallet", balancesOk && transactionsOk, balancesOk && transactionsOk ? "Ready" : "Unavailable"),
    payments: check("Payments", manualDepositsOk, manualDepositsOk ? "Ready" : "Unavailable"),
    kyc: check("KYC", kycOk, kycOk ? "Ready" : "Unavailable"),
    withdrawals: check("Withdrawals", withdrawalsOk, withdrawalsOk ? "Ready" : "Unavailable"),
  };

  const active = checks.web.active && checks.supabase.active && checks.wallet.active && checks.kyc.active;
  const status = active ? "operational" : checks.supabase.active ? "degraded" : "offline";
  const timestamp = new Date().toISOString();
  const latencyMs = Date.now() - startedAt;

  const telemetryMeta = { status, latency_ms: latencyMs, checks };
  try {
    await upsertChidoPresence({ status: status === "operational" ? "online" : status, meta: telemetryMeta });
    if (emitEvent) {
      await recordChidoEvent({
        type: "chido.status.check",
        message: `Chido Casino reportó estado ${status}.`,
        level: active ? "info" : status === "degraded" ? "warning" : "error",
        data: telemetryMeta,
      });
    }
  } catch (error) {
    console.warn("System status telemetry failed", error);
  }

  const publicPayload = {
    ok: active,
    status,
    timestamp,
  };

  if (!detailed) {
    return NextResponse.json(publicPayload, {
      status: status === "offline" ? 503 : 200,
      headers: { "Cache-Control": "no-store" },
    });
  }

  return NextResponse.json(
    {
      ...publicPayload,
      service: "chido.casino",
      latency_ms: latencyMs,
      checks,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
