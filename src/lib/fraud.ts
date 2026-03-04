import "server-only";
import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

function sha16(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);
}

function getIp(req: Request) {
  const xf = req.headers.get("x-forwarded-for") || "";
  const ip = xf.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "";
  return ip.trim();
}

export async function fraudLog(
  supabaseAdmin: SupabaseClient,
  req: Request,
  params: { userId?: string | null; eventType: string; metadata?: any }
) {
  try {
    const userId = params.userId ? String(params.userId) : null;
    const ua = req.headers.get("user-agent") || "";
    const ip = getIp(req);
    const deviceId = req.headers.get("x-device-id") || "";

    const row = {
      user_id: userId,
      event_type: params.eventType,
      ip_hash: ip ? sha16(ip) : null,
      device_hash: deviceId ? sha16(deviceId) : null,
      user_agent: ua || null,
      metadata: params.metadata ?? {},
    };

    // Si tabla no existe aún, no rompemos flujo
    await supabaseAdmin.from("fraud_events").insert(row as any);
  } catch {
    // ignore
  }
}

export async function velocityLimit(
  supabaseAdmin: SupabaseClient,
  table: "manual_deposit_requests" | "withdraw_requests",
  params: { userId: string; minutes: number; max: number }
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const since = new Date(Date.now() - params.minutes * 60 * 1000).toISOString();

    const q: any = supabaseAdmin
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq("user_id", params.userId)
      .gte("created_at", since);

    const res = await q;

    const count = Number(res.count || 0);
    if (count >= params.max) {
      return {
        ok: false,
        error: `Límite temporal: intenta más tarde. (${count}/${params.max} en ${params.minutes} min)`,
      };
    }
    return { ok: true };
  } catch {
    // si falla conteo, no bloqueamos
    return { ok: true };
  }
}