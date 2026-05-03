import { NextRequest, NextResponse } from "next/server";
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

function env(...keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return "";
}

function configured(...keys: string[]): boolean {
  return Boolean(env(...keys));
}

function check(label: string, active: boolean, detail: string): Check {
  return { active, label, detail };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const emitEvent = url.searchParams.get("emit_event") === "1";

  const startedAt = Date.now();

  const [
    profilesOk,
    balancesOk,
    transactionsOk,
    kycOk,
    manualDepositsOk,
    withdrawalsOk,
  ] = await Promise.all([
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
    supabase: check("Supabase", supabaseOnline, supabaseOnline ? "Online" : "Sin lectura"),
    wallet: check("Wallet", balancesOk && transactionsOk, balancesOk && transactionsOk ? "Tablas listas" : "Revisar tablas"),
    payments: check(
      "Pagos",
      manualDepositsOk || configured("ASTROPAY_API_KEY", "JUNO_API_KEY", "MANUAL_DEPOSITS_ENABLED"),
      manualDepositsOk ? "Manual listo" : "Configuración parcial",
    ),
    kyc: check("KYC", kycOk, kycOk ? "Disponible" : "Sin tabla"),
    withdrawals: check("Retiros", withdrawalsOk, withdrawalsOk ? "Disponible" : "Sin tabla"),
    responsible: check("Juego responsable", true, "Activo"),
    games: check("Juegos", true, "Catálogo activo"),
    pwa: check("PWA", true, "Preparada"),
  };

  const critical = [
    checks.web.active,
    checks.supabase.active,
    checks.wallet.active,
    checks.kyc.active,
  ];

  const active = critical.every(Boolean);
  const degraded = !active && checks.supabase.active;

  const status = active ? "online" : degraded ? "degraded" : "offline";

  const payload = {
    ok: active,
    service: "chido.casino",
    project_id: "chido-casino",
    node_id: "chido-casino-web",
    status,
    timestamp: new Date().toISOString(),
    latency_ms: Date.now() - startedAt,
    runtime: {
      node: process.version,
      environment: process.env.NODE_ENV ?? "unknown",
    },
    integration: {
      hocker_one: true,
      shared_supabase_project: configured("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"),
      mode: "read_only_monitoring",
    },
    checks,
  };

  const meta = {
    status,
    latency_ms: payload.latency_ms,
    checks,
    runtime: payload.runtime,
    integration: payload.integration,
  };

  try {
    await upsertChidoPresence({
      status,
      meta,
    });

    if (emitEvent) {
      await recordChidoEvent({
        type: "chido.status.check",
        message: `Chido Casino reportó estado ${status}.`,
        level: active ? "info" : degraded ? "warning" : "error",
        data: meta,
      });
    }
  } catch (error) {
    return NextResponse.json(
      {
        ...payload,
        ok: false,
        status: "degraded",
        telemetry_error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 200 },
    );
  }

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
