export const runtime = "nodejs";

import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { fraudLog, velocityLimit } from "@/lib/fraud";

type DetectedFile = {
  bytes: Buffer;
  mime: "image/jpeg" | "image/png" | "application/pdf";
  extension: "jpg" | "png" | "pdf";
  sha256: string;
};

const MAX_BYTES = 8 * 1024 * 1024;

function parseDateOfBirth(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime())) return null;
  const [year, month, day] = text.split("-").map(Number);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  const today = new Date();
  const adultBefore = new Date(
    Date.UTC(
      today.getUTCFullYear() - 18,
      today.getUTCMonth(),
      today.getUTCDate()
    )
  );
  return date <= adultBefore ? text : null;
}

function isFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

async function inspectFile(file: File): Promise<DetectedFile | null> {
  if (file.size < 4 || file.size > MAX_BYTES) return null;
  const bytes = Buffer.from(await file.arrayBuffer());

  let mime: DetectedFile["mime"];
  let extension: DetectedFile["extension"];
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    mime = "image/jpeg";
    extension = "jpg";
  } else if (
    bytes.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    )
  ) {
    mime = "image/png";
    extension = "png";
  } else if (bytes.subarray(0, 5).toString("ascii") === "%PDF-") {
    mime = "application/pdf";
    extension = "pdf";
  } else {
    return null;
  }

  return {
    bytes,
    mime,
    extension,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
  };
}

async function uploadOne(
  userId: string,
  requestId: string,
  key: "id_front" | "id_back" | "selfie",
  file: DetectedFile
) {
  const path = `${userId}/${requestId}/${key}.${file.extension}`;
  const { error } = await supabaseAdmin.storage.from("kyc").upload(
    path,
    file.bytes,
    {
      contentType: file.mime,
      upsert: false,
      cacheControl: "0",
    }
  );
  if (error) throw new Error(`KYC_UPLOAD_FAILED:${key}`);
  return path;
}

export async function POST(req: Request) {
  const session = await getServerSession(req);
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const limit = await velocityLimit(supabaseAdmin as any, "kyc_requests", {
    userId: session.user.id,
    minutes: 60,
    max: 3,
  });
  if (!limit.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: limit.unavailable
          ? "RATE_LIMIT_UNAVAILABLE"
          : "RATE_LIMIT_EXCEEDED",
        resetAt: limit.resetAt || null,
      },
      { status: limit.unavailable ? 503 : 429 }
    );
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json(
      { ok: false, error: "FORMDATA_INVALID" },
      { status: 400 }
    );
  }

  const dateOfBirth = parseDateOfBirth(form.get("date_of_birth"));
  if (!dateOfBirth) {
    return NextResponse.json(
      { ok: false, error: "ADULT_DATE_OF_BIRTH_REQUIRED" },
      { status: 400 }
    );
  }

  const frontValue = form.get("id_front");
  const backValue = form.get("id_back");
  const selfieValue = form.get("selfie");
  if (!isFile(frontValue) || !isFile(backValue) || !isFile(selfieValue)) {
    return NextResponse.json(
      { ok: false, error: "KYC_DOCUMENTS_REQUIRED" },
      { status: 400 }
    );
  }

  const [front, back, selfie] = await Promise.all([
    inspectFile(frontValue),
    inspectFile(backValue),
    inspectFile(selfieValue),
  ]);
  if (!front || !back || !selfie) {
    return NextResponse.json(
      {
        ok: false,
        error: "KYC_FILE_INVALID",
        message: "Solo JPEG, PNG o PDF válidos de hasta 8 MB.",
      },
      { status: 400 }
    );
  }

  const userId = session.user.id;
  const { data: requestId, error: beginError } = await supabaseAdmin.rpc(
    "begin_kyc_request",
    {
      p_user_id: userId,
      p_date_of_birth: dateOfBirth,
    }
  );
  if (beginError || !requestId) {
    const message = beginError?.message || "KYC_BEGIN_FAILED";
    const status = message.includes("ALREADY_OPEN") ? 409 : 422;
    return NextResponse.json(
      { ok: false, error: message.includes("ADULT") ? "ADULT_AGE_REQUIRED" : "KYC_BEGIN_FAILED" },
      { status }
    );
  }

  const uploadedPaths: string[] = [];
  try {
    const idFrontPath = await uploadOne(userId, String(requestId), "id_front", front);
    uploadedPaths.push(idFrontPath);
    const idBackPath = await uploadOne(userId, String(requestId), "id_back", back);
    uploadedPaths.push(idBackPath);
    const selfiePath = await uploadOne(userId, String(requestId), "selfie", selfie);
    uploadedPaths.push(selfiePath);

    const { data, error } = await supabaseAdmin.rpc("finalize_kyc_request", {
      p_request_id: requestId,
      p_user_id: userId,
      p_id_front_path: idFrontPath,
      p_id_back_path: idBackPath,
      p_selfie_path: selfiePath,
      p_document_hashes: {
        id_front: front.sha256,
        id_back: back.sha256,
        selfie: selfie.sha256,
      },
    });
    if (error) throw new Error("KYC_FINALIZE_FAILED");

    await fraudLog(supabaseAdmin as any, req, {
      userId,
      eventType: "kyc_submitted",
      metadata: { request_id: requestId, version: 2 },
    });

    return NextResponse.json({ ok: true, request: data });
  } catch (error) {
    if (uploadedPaths.length > 0) {
      const cleanup = await supabaseAdmin.storage.from("kyc").remove(uploadedPaths);
      if (cleanup.error) {
        console.error("KYC storage cleanup failed", cleanup.error);
      }
    }
    await supabaseAdmin.rpc("fail_kyc_request", {
      p_request_id: requestId,
      p_user_id: userId,
      p_reason: error instanceof Error ? error.message : "KYC_SUBMIT_FAILED",
    });
    return NextResponse.json(
      { ok: false, error: "KYC_SUBMIT_FAILED" },
      { status: 500 }
    );
  }
}
