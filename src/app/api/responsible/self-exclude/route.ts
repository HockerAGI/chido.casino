export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { fraudLog } from "@/lib/fraud";

const DURATIONS: Record<string, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "180d": 180 * 24 * 60 * 60 * 1000,
  // permanente: 10 años
  "permanent": 10 * 365 * 24 * 60 * 60 * 1000,
};

export async function POST(req: Request) {
  const session = await getServerSession(req);
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const duration = String(body?.duration || "").trim();
  const reason = String(body?.reason || "").trim().slice(0, 300);

  const ms = DURATIONS[duration];
  if (!ms) return NextResponse.json({ ok: false, error: "Duración inválida" }, { status: 400 });

  const until = new Date(Date.now() + ms).toISOString();

  const up = await supabaseAdmin
    .from("profiles")
    .update({
      self_excluded_until: until,
      self_excluded_at: new Date().toISOString(),
      self_excluded_reason: reason || null,
    } as any)
    .eq("user_id", session.user.id);

  if (up.error) return NextResponse.json({ ok: false, error: up.error.message }, { status: 500 });

  await fraudLog(supabaseAdmin as any, req, {
    userId: session.user.id,
    eventType: "self_exclude_set",
    metadata: { duration, until, reason: reason || null },
  });

  return NextResponse.json({ ok: true, excluded: true, until });
}