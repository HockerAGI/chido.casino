export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function mustAdmin(req: Request) {
  const token = req.headers.get("x-admin-token") || "";
  const expected = process.env.ADMIN_API_TOKEN || "";
  return Boolean(expected && token === expected);
}

function cleanLike(q: string) {
  return q.replace(/[%_]/g, "").trim();
}
function isSchemaMismatch(msg: string) {
  const m = (msg || "").toLowerCase();
  return m.includes("column") || m.includes("does not exist") || m.includes("unknown");
}

export async function POST(req: Request) {
  if (!mustAdmin(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const qRaw = String(body?.q || "").trim();
  const limit = Math.max(1, Math.min(25, Number(body?.limit || 10)));

  if (!qRaw) return NextResponse.json({ ok: true, users: [] });

  const q = cleanLike(qRaw);
  const like = `%${q}%`;

  // Best-effort: intentamos select con email; si tronara por schema, fallback.
  let sel = "user_id, username, email, role, kyc_status, created_at";
  let query = supabaseAdmin
    .from("profiles")
    .select(sel)
    .or(`user_id.eq.${q},username.ilike.${like},email.ilike.${like}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  let res = await query;

  if (res.error && isSchemaMismatch(String(res.error.message || ""))) {
    sel = "user_id, username, role, kyc_status, created_at";
    res = await supabaseAdmin
      .from("profiles")
      .select(sel)
      .or(`user_id.eq.${q},username.ilike.${like}`)
      .order("created_at", { ascending: false })
      .limit(limit);
  }

  if (res.error) return NextResponse.json({ ok: false, error: res.error.message }, { status: 500 });

  return NextResponse.json({ ok: true, users: res.data || [] });
}