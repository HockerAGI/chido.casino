export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getPromoLimitState } from "@/lib/promoLimits";

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const state = await getPromoLimitState(
    supabaseAdmin as any,
    session.user.id
  );
  if (!state.ok) {
    console.error("Promo limit status unavailable", state.error);
    return NextResponse.json(
      { ok: false, error: "PROMO_LIMIT_CHECK_FAILED" },
      { status: 503 }
    );
  }

  if (!state.hasRollover) {
    return NextResponse.json({ ok: true, hasRollover: false });
  }

  const pct =
    state.required > 0
      ? Math.min(100, Math.round((state.progress / state.required) * 100))
      : 0;

  return NextResponse.json({
    ok: true,
    hasRollover: true,
    maxBet: state.maxBet,
    required: state.required,
    progress: state.progress,
    pct,
    source: state.source,
  });
}
