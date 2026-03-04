export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function maskUser(u: string) {
  const s = String(u || "");
  if (s.length <= 8) return `Jugador ${s.slice(0, 4)}…`;
  return `Jugador ${s.slice(0, 4)}…${s.slice(-4)}`;
}

export async function GET() {
  try {
    // Crash wins
    const crash = await supabaseAdmin
      .from("crash_bets")
      .select("id,user_id,bet_amount,payout,created_at")
      .gt("payout", 0)
      .order("created_at", { ascending: false })
      .limit(12);

    // Slot wins
    const slot = await supabaseAdmin
      .from("slot_spins")
      .select("id,user_id,bet_amount,payout_amount,created_at")
      .gt("payout_amount", 0)
      .order("created_at", { ascending: false })
      .limit(12);

    const crashRows = (crash.data || []).map((r: any) => ({
      id: `cr_${r.id}`,
      game: "crash" as const,
      user_id: r.user_id,
      profit: Number(r.payout || 0) - Number(r.bet_amount || 0),
      ts: r.created_at || null,
    }));

    const slotRows = (slot.data || []).map((r: any) => ({
      id: `ts_${r.id}`,
      game: "taco_slot" as const,
      user_id: r.user_id,
      profit: Number(r.payout_amount || 0) - Number(r.bet_amount || 0),
      ts: r.created_at || null,
    }));

    const merged = [...crashRows, ...slotRows]
      .filter((x) => Number.isFinite(x.profit) && x.profit > 0 && x.ts)
      .sort((a, b) => String(b.ts).localeCompare(String(a.ts)))
      .slice(0, 10);

    // Traer usernames si existen (best-effort)
    const ids = Array.from(new Set(merged.map((x) => x.user_id))).filter(Boolean);

    let nameMap = new Map<string, string>();
    if (ids.length > 0) {
      const prof = await supabaseAdmin
        .from("profiles")
        .select("user_id,username,full_name")
        .in("user_id", ids);

      (prof.data || []).forEach((p: any) => {
        const name = String(p.username || p.full_name || "").trim();
        if (name) nameMap.set(String(p.user_id), name);
      });
    }

    const items = merged.map((x) => ({
      id: x.id,
      game: x.game,
      user: nameMap.get(String(x.user_id)) || maskUser(String(x.user_id)),
      profit: Number(x.profit.toFixed(0)),
      ts: x.ts,
    }));

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json({ ok: false, items: [] }, { status: 200 });
  }
}