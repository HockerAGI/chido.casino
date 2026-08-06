import "server-only";
import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

function sha16(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function getIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  const ip =
    forwarded.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "";
  return ip.trim();
}

export async function fraudLog(
  supabaseAdmin: SupabaseClient,
  req: Request,
  params: { userId?: string | null; eventType: string; metadata?: unknown }
) {
  try {
    const userId = params.userId ? String(params.userId) : null;
    const userAgent = req.headers.get("user-agent") || "";
    const ip = getIp(req);
    const deviceId = req.headers.get("x-device-id") || "";

    const { error } = await supabaseAdmin.from("fraud_events").insert({
      user_id: userId,
      event_type: params.eventType,
      ip_hash: ip ? sha16(ip) : null,
      device_hash: deviceId ? sha16(deviceId) : null,
      user_agent: userAgent || null,
      metadata: params.metadata ?? {},
    } as never);

    return { ok: !error, error: error?.message || null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "FRAUD_LOG_FAILED",
    };
  }
}

export async function velocityLimit(
  supabaseAdmin: SupabaseClient,
  scope: "manual_deposit_requests" | "withdraw_requests" | "deposit_intents" | "kyc_requests" | "game_wagers",
  params: { userId: string; minutes: number; max: number }
): Promise<
  | { ok: true; remaining: number; resetAt: string | null }
  | { ok: false; error: string; unavailable?: boolean; resetAt?: string | null }
> {
  try {
    const userId = String(params.userId || "").trim();
    if (!userId || !Number.isInteger(params.minutes) || params.minutes < 1 || !Number.isInteger(params.max) || params.max < 1) {
      return { ok: false, error: "RATE_LIMIT_CONFIG_INVALID", unavailable: true };
    }

    const { data, error } = await supabaseAdmin.rpc("consume_rate_limit", {
      p_key: `${scope}:${userId}`,
      p_max_hits: params.max,
      p_window_seconds: params.minutes * 60,
    });

    if (error || !data || typeof data !== "object") {
      console.error("Atomic rate limit unavailable", error);
      return { ok: false, error: "RATE_LIMIT_UNAVAILABLE", unavailable: true };
    }

    const result = data as Record<string, unknown>;
    const allowed = result.allowed === true;
    const remaining = Number(result.remaining ?? 0);
    const resetAt = typeof result.reset_at === "string" ? result.reset_at : null;

    if (!allowed) {
      return {
        ok: false,
        error: "RATE_LIMIT_EXCEEDED",
        resetAt,
      };
    }

    return {
      ok: true,
      remaining: Number.isFinite(remaining) ? remaining : 0,
      resetAt,
    };
  } catch (error) {
    console.error("Atomic rate limit failed", error);
    return { ok: false, error: "RATE_LIMIT_UNAVAILABLE", unavailable: true };
  }
}
