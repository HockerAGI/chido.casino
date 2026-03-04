export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { fraudLog } from "@/lib/fraud";

function extFrom(file: File) {
  const name = (file.name || "").toLowerCase();
  const dot = name.lastIndexOf(".");
  if (dot !== -1) return name.slice(dot + 1).slice(0, 8);
  const t = (file.type || "").toLowerCase();
  if (t.includes("png")) return "png";
  if (t.includes("jpeg") || t.includes("jpg")) return "jpg";
  if (t.includes("pdf")) return "pdf";
  return "bin";
}

function okType(file: File) {
  const t = (file.type || "").toLowerCase();
  return t.startsWith("image/") || t === "application/pdf";
}

async function uploadOne(userId: string, key: string, file: File) {
  const bucket = supabaseAdmin.storage.from("kyc");
  const bytes = Buffer.from(await file.arrayBuffer());
  const path = `${userId}/${Date.now()}_${key}.${extFrom(file)}`;

  const up = await bucket.upload(path, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });

  if (up.error) throw new Error(up.error.message);
  return path;
}

export async function POST(req: Request) {
  const session = await getServerSession(req);
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ ok: false, error: "FORMDATA_INVALID" }, { status: 400 });

  const idFront = form.get("id_front") as File | null;
  const idBack = form.get("id_back") as File | null;
  const selfie = form.get("selfie") as File | null;

  if (!idFront) return NextResponse.json({ ok: false, error: "Falta ID frente" }, { status: 400 });
  if (!okType(idFront)) return NextResponse.json({ ok: false, error: "Formato inválido (solo imagen o PDF)" }, { status: 400 });

  const maxBytes = 10 * 1024 * 1024; // 10MB
  if (idFront.size > maxBytes) return NextResponse.json({ ok: false, error: "Archivo muy grande (max 10MB)" }, { status: 400 });
  if (idBack && idBack.size > maxBytes) return NextResponse.json({ ok: false, error: "Archivo muy grande (max 10MB)" }, { status: 400 });
  if (selfie && selfie.size > maxBytes) return NextResponse.json({ ok: false, error: "Archivo muy grande (max 10MB)" }, { status: 400 });

  try {
    const userId = session.user.id;

    // subir
    const id_front_path = await uploadOne(userId, "id_front", idFront);
    const id_back_path = idBack ? await uploadOne(userId, "id_back", idBack) : null;
    const selfie_path = selfie ? await uploadOne(userId, "selfie", selfie) : null;

    // crear request pending
    const ins = await supabaseAdmin
      .from("kyc_requests")
      .insert({
        user_id: userId,
        status: "pending",
        submitted_at: new Date().toISOString(),
        id_front_path,
        id_back_path,
        selfie_path,
        metadata: { v: 1 },
      } as any)
      .select("id,status,submitted_at")
      .single();

    if (ins.error) throw new Error(ins.error.message);

    // marcar profile pending (real)
    await supabaseAdmin.from("profiles").update({ kyc_status: "pending" } as any).eq("user_id", userId);

    await fraudLog(supabaseAdmin as any, req, { userId, eventType: "kyc_submitted", metadata: { request_id: ins.data?.id } });

    return NextResponse.json({ ok: true, request: ins.data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "KYC_SUBMIT_ERROR" }, { status: 500 });
  }
}