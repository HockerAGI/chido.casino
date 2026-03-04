export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getPromoLimitState } from "@/lib/promoLimits";

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const s = await getPromoLimitState(supabaseAdmin as any, session.user.id);
  if (!s.ok) return NextResponse.json({ ok: false, error: s.error }, { status: 500 });

  if (!s.hasRollover) return NextResponse.json({ ok: true, hasRollover: false });

  const pct = s.required > 0 ? Math.min(100, Math.round((s.progress / s.required) * 100)) : 0;

  return NextResponse.json({
    ok: true,
    hasRollover: true,
    maxBet: s.maxBet,
    required: s.required,
    progress: s.progress,
    pct,
    source: s.source,
  });
}