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
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const crash = await supabaseAdmin
      .from("crash_bets")
      .select("user_id,bet_amount,target_multiplier,did_cashout,payout,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000);

    const slots = await supabaseAdmin
      .from("slot_spins")
      .select("user_id,bet_amount,multiplier,payout_amount,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000);

    const acc = new Map<
      string,
      { points: number; profit: number; wager: number; plays: number }
    >();

    for (const r of (crash.data || []) as any[]) {
      const uid = String(r.user_id || "");
      if (!uid) continue;
      const bet = Number(r.bet_amount || 0);
      const payout = Number(r.payout || 0);
      const tm = Number(r.target_multiplier || 0);
      const win = Boolean(r.did_cashout);

      const points = win ? bet * tm : 0; // multipliers altos = más puntos
      const profit = payout - bet;

      const cur = acc.get(uid) || { points: 0, profit: 0, wager: 0, plays: 0 };
      cur.points += points;
      cur.profit += profit;
      cur.wager += bet;
      cur.plays += 1;
      acc.set(uid, cur);
    }

    for (const r of (slots.data || []) as any[]) {
      const uid = String(r.user_id || "");
      if (!uid) continue;
      const bet = Number(r.bet_amount || 0);
      const payout = Number(r.payout_amount || 0);
      const mult = Number(r.multiplier || 0);

      const points = bet * mult; // slots: puntos proporcional al multiplicador
      const profit = payout - bet;

      const cur = acc.get(uid) || { points: 0, profit: 0, wager: 0, plays: 0 };
      cur.points += points;
      cur.profit += profit;
      cur.wager += bet;
      cur.plays += 1;
      acc.set(uid, cur);
    }

    const users = Array.from(acc.entries())
      .map(([user_id, v]) => ({ user_id, ...v }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 25);

    // usernames best-effort
    const ids = users.map((x) => x.user_id);
    const prof = ids.length
      ? await supabaseAdmin.from("profiles").select("user_id,username,full_name").in("user_id", ids)
      : { data: [] as any[] };

    const m = new Map<string, string>();
    (prof.data || []).forEach((p: any) => {
      const name = String(p.username || p.full_name || "").trim();
      if (name) m.set(String(p.user_id), name);
    });

    return NextResponse.json({
      ok: true,
      period: { days: 7, since },
      leaderboard: users.map((u, i) => ({
        rank: i + 1,
        user: m.get(u.user_id) || maskUser(u.user_id),
        points: Math.round(u.points),
        profit: Math.round(u.profit),
        wager: Math.round(u.wager),
        plays: u.plays,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: true, leaderboard: [], period: { days: 7 } }, { status: 200 });
  }
}