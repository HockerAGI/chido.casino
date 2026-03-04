export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function mustAdmin(req: Request) {
  const token = req.headers.get("x-admin-token") || "";
  const expected = process.env.ADMIN_API_TOKEN || "";
  return Boolean(expected && token === expected);
}
function isMissingTable(msg: string) {
  const m = (msg || "").toLowerCase();
  return m.includes("relation") && m.includes("does not exist");
}

export async function POST(req: Request) {
  if (!mustAdmin(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const userId = String(body?.userId || "").trim();
  if (!userId) return NextResponse.json({ ok: false, error: "userId requerido" }, { status: 400 });

  const profile = await supabaseAdmin.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  if (profile.error) return NextResponse.json({ ok: false, error: profile.error.message }, { status: 500 });

  const balances = await supabaseAdmin
    .from("balances")
    .select("balance, bonus_balance, locked_balance")
    .eq("user_id", userId)
    .maybeSingle();

  const txs = await supabaseAdmin
    .from("transactions")
    .select("id, type, amount, created_at, metadata")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(25);

  const promo = await supabaseAdmin
    .from("promo_claims")
    .select("id, offer_id, status, claimed_at, expires_at, bonus_awarded, wagering_required, wagering_progress, metadata")
    .eq("user_id", userId)
    .in("status", ["active", "applied", "completed"])
    .order("claimed_at", { ascending: false })
    .limit(3);

  const crash = await supabaseAdmin
    .from("crash_bets")
    .select("id, bet_amount, target_multiplier, crash_multiplier, did_cashout, payout, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(15);

  const slots = await supabaseAdmin
    .from("slot_spins")
    .select("id, bet_amount, multiplier, payout_amount, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(15);

  // Si slot_spins no existe, no truena el endpoint (no “finge”)
  const slotsSafe = slots.error && isMissingTable(String(slots.error.message || "")) ? { data: [] as any[] } : slots;

  if (balances.error) return NextResponse.json({ ok: false, error: balances.error.message }, { status: 500 });
  if (txs.error) return NextResponse.json({ ok: false, error: txs.error.message }, { status: 500 });
  if (promo.error) return NextResponse.json({ ok: false, error: promo.error.message }, { status: 500 });
  if (crash.error) return NextResponse.json({ ok: false, error: crash.error.message }, { status: 500 });
  if ((slotsSafe as any).error) return NextResponse.json({ ok: false, error: (slotsSafe as any).error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    profile: profile.data || null,
    balances: balances.data || { balance: 0, bonus_balance: 0, locked_balance: 0 },
    transactions: txs.data || [],
    promo_claims: promo.data || [],
    last_crash: crash.data || [],
    last_slots: (slotsSafe as any).data || [],
  });
}