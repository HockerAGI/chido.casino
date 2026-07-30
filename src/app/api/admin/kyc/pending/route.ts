export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const auth = await requireAdmin(req, "kyc:read");
  if (!auth.ok) return auth.response;

  try {
    const { data, error } = await supabaseAdmin
      .from("kyc_requests")
      .select(
        `
        id,
        user_id,
        status,
        submitted_at,
        id_front_path,
        id_back_path,
        selfie_path,
        profiles (
          username,
          email
        )
      `
      )
      .eq("status", "pending")
      .order("submitted_at", { ascending: true });

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, requests: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "KYC_PENDING_ERROR" }, { status: 500 });
  }
}
