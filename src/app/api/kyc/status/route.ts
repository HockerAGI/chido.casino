export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const prof = await supabaseAdmin
    .from("profiles")
    .select("kyc_status")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (prof.error) return NextResponse.json({ ok: false, error: prof.error.message }, { status: 500 });

  const reqRow = await supabaseAdmin
    .from("kyc_requests")
    .select("id,status,submitted_at,reviewed_at,review_note,created_at")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Si tabla aún no existe, no rompemos
  if (reqRow.error && String(reqRow.error.message || "").toLowerCase().includes("relation") && String(reqRow.error.message || "").toLowerCase().includes("does not exist")) {
    return NextResponse.json({ ok: true, kyc_status: prof.data?.kyc_status ?? null, request: null });
  }

  if (reqRow.error) return NextResponse.json({ ok: false, error: reqRow.error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    kyc_status: prof.data?.kyc_status ?? null,
    request: reqRow.data ?? null,
  });
}