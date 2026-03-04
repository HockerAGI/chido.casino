export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSession } from "@/lib/session";

function isMissingTable(msg: string) {
  const m = (msg || "").toLowerCase();
  return m.includes("relation") && m.includes("does not exist");
}

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const userId = session.user.id;

  // Crash
  const crash = await supabaseAdmin
    .from("crash_bets")
    .select("id, bet_amount, target_multiplier, crash_multiplier, did_cashout, payout, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(25);

  if (crash.error && !isMissingTable(String(crash.error.message || ""))) {
    return NextResponse.json({ ok: false, error: crash.error.message }, { status: 500 });
  }

  // Slot
  const slot = await supabaseAdmin
    .from("slot_spins")
    .select("id, bet_amount, multiplier, payout_amount, reels, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(25);

  if (slot.error && !isMissingTable(String(slot.error.message || ""))) {
    return NextResponse.json({ ok: false, error: slot.error.message }, { status: 500 });
  }

  const crashRows = (crash.data || []).map((r: any) => ({
    id: `cr_${r.id}`,
    game: "crash" as const,
    bet: Number(r.bet_amount || 0),
    payout: Number(r.payout || 0),
    profit: Number(r.payout || 0) - Number(r.bet_amount || 0),
    created_at: r.created_at,
    meta: {
      target_multiplier: r.target_multiplier,
      crash_multiplier: r.crash_multiplier,
      did_cashout: r.did_cashout,
    },
  }));

  const slotRows = (slot.data || []).map((r: any) => ({
    id: `ts_${r.id}`,
    game: "taco_slot" as const,
    bet: Number(r.bet_amount || 0),
    payout: Number(r.payout_amount || 0),
    profit: Number(r.payout_amount || 0) - Number(r.bet_amount || 0),
    created_at: r.created_at,
    meta: {
      multiplier: r.multiplier,
      reels: r.reels,
    },
  }));

  const combined = [...crashRows, ...slotRows]
    .filter((x) => x.created_at)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, 30);

  return NextResponse.json({
    ok: true,
    crash: crashRows,
    slots: slotRows,
    combined,
  });
}