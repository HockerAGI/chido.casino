export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type KycRow = {
  id: string;
  user_id: string;
  status: string;
  submitted_at: string | null;
  id_front_path: string | null;
  id_back_path: string | null;
  selfie_path: string | null;
  document_hashes: Record<string, string> | null;
  metadata: Record<string, unknown> | null;
  profiles: {
    username: string | null;
    email: string | null;
    date_of_birth: string | null;
  } | null;
};

async function signedUrl(path: string | null) {
  if (!path) return null;
  const { data, error } = await supabaseAdmin.storage
    .from("kyc")
    .createSignedUrl(path, 300);
  if (error || !data?.signedUrl) {
    throw new Error("KYC_SIGNED_URL_FAILED");
  }
  return data.signedUrl;
}

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
        document_hashes,
        metadata,
        profiles (
          username,
          email,
          date_of_birth
        )
      `
      )
      .in("status", ["pending", "review_required"])
      .order("submitted_at", { ascending: true });

    if (error) throw new Error(error.message);

    const requests = await Promise.all(
      ((data || []) as unknown as KycRow[]).map(async (row) => ({
        id: row.id,
        user_id: row.user_id,
        status: row.status,
        submitted_at: row.submitted_at,
        document_hashes: row.document_hashes || {},
        declared_date_of_birth:
          String(row.metadata?.declared_date_of_birth || "") ||
          row.profiles?.date_of_birth ||
          null,
        profiles: row.profiles,
        documents: {
          id_front: await signedUrl(row.id_front_path),
          id_back: await signedUrl(row.id_back_path),
          selfie: await signedUrl(row.selfie_path),
        },
      }))
    );

    return NextResponse.json(
      { ok: true, requests },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("KYC pending fetch failed", error);
    return NextResponse.json(
      { ok: false, error: "KYC_PENDING_ERROR" },
      { status: 500 }
    );
  }
}
