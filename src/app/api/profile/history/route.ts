export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.id) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const [crash, slot] = await Promise.all([
    supabase.rpc("get_my_crash_history", { p_limit: 25 }),
    supabase.rpc("get_my_slot_history", { p_limit: 25 }),
  ]);

  if (crash.error || slot.error) {
    console.error("Private game history failed", {
      crash: crash.error?.message || null,
      slot: slot.error?.message || null,
    });
    return NextResponse.json(
      { ok: false, error: "GAME_HISTORY_UNAVAILABLE" },
      { status: 503 }
    );
  }

  const crashRows = (crash.data || []).map((row: any) => ({
    id: `cr_${row.id}`,
    game: "crash" as const,
    bet: Number(row.bet_amount || 0),
    payout: Number(row.payout || 0),
    profit: Number(row.payout || 0) - Number(row.bet_amount || 0),
    created_at: row.created_at,
    meta: {
      target_multiplier: row.target_multiplier,
      crash_multiplier: row.crash_multiplier,
      did_cashout: row.did_cashout,
      ref_id: row.ref_id,
      server_seed_hash: row.server_seed_hash,
      server_seed: row.server_seed,
    },
  }));

  const slotRows = (slot.data || []).map((row: any) => ({
    id: `ts_${row.id}`,
    game: "taco_slot" as const,
    bet: Number(row.bet_amount || 0),
    payout: Number(row.payout_amount || 0),
    profit: Number(row.payout_amount || 0) - Number(row.bet_amount || 0),
    created_at: row.created_at,
    meta: {
      multiplier: row.multiplier,
      reels: row.reels,
      round_ref: row.round_ref,
      server_seed_hash: row.server_seed_hash,
      server_seed: row.server_seed,
      client_seed: row.client_seed,
      nonce: row.nonce,
    },
  }));

  const combined = [...crashRows, ...slotRows]
    .filter((row) => row.created_at)
    .sort((a, b) =>
      String(b.created_at).localeCompare(String(a.created_at))
    )
    .slice(0, 30);

  return NextResponse.json(
    {
      ok: true,
      crash: crashRows,
      slots: slotRows,
      combined,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
