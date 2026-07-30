export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function cleanLike(q: string) {
  return q.replace(/[%_]/g, "").trim();
}

function isSchemaMismatch(msg: string) {
  const m = (msg || "").toLowerCase();
  return m.includes("column") || m.includes("does not exist") || m.includes("unknown");
}

export async function POST(req: Request) {
  const auth = await requireAdmin(req, "users:read");
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({} as any));
  const qRaw = String(body?.q || "").trim();
  const limit = Math.max(1, Math.min(25, Number(body?.limit || 10)));

  if (!qRaw) return NextResponse.json({ ok: true, users: [] });

  const q = cleanLike(qRaw);
  const like = `%${q}%`;

  let sel = "user_id, username, email, role, kyc_status, created_at";
  let res = await supabaseAdmin
    .from("profiles")
    .select(sel)
    .or(`user_id.eq.${q},username.ilike.${like},email.ilike.${like}`)
    .order("created_at", { ascending: false })
    .limit(limit);

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
