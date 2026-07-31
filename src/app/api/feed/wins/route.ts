export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin.rpc("get_public_recent_wins", {
    p_limit: 10,
  });

  if (error) {
    console.error("Public wins feed query failed", error);
    return NextResponse.json(
      { ok: false, error: "WINS_FEED_UNAVAILABLE", items: [] },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const items = ((data || []) as Array<Record<string, unknown>>).map((row, index) => ({
    id: `win_${new Date(String(row.created_at || 0)).getTime()}_${index}`,
    game: String(row.game || "unknown"),
    user: String(row.display_name || "Jugador"),
    profit: Math.round(Number(row.payout || 0)),
    multiplier: Number(row.multiplier || 0),
    ts: String(row.created_at || ""),
  }));

  return NextResponse.json(
    { ok: true, items },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    }
  );
}
