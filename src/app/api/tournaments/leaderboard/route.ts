export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const days = 7;
  const { data, error } = await supabaseAdmin.rpc("get_public_leaderboard", {
    p_days: days,
    p_limit: 25,
  });

  if (error) {
    console.error("Public leaderboard query failed", error);
    return NextResponse.json(
      { ok: false, error: "LEADERBOARD_UNAVAILABLE", leaderboard: [], period: { days } },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const leaderboard = ((data || []) as Array<Record<string, unknown>>).map((row) => ({
    rank: Number(row.rank || 0),
    user: String(row.display_name || "Jugador"),
    points: Number(row.points || 0),
    profit: Number(row.profit || 0),
    wager: Number(row.wager || 0),
    plays: Number(row.plays || 0),
  }));

  return NextResponse.json(
    { ok: true, period: { days }, leaderboard },
    {
      headers: {
        "Cache-Control": "public, s-maxage=45, stale-while-revalidate=60",
      },
    }
  );
}
