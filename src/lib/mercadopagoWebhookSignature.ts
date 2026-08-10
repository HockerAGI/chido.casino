import "server-only";

import crypto from "node:crypto";

export type MercadoPagoSignatureDecision = {
  enforced: boolean;
  ok: boolean;
  reason:
    | "VALID"
    | "NOT_ENFORCED"
    | "SECRET_MISSING"
    | "HEADERS_MISSING"
    | "SIGNATURE_FORMAT_INVALID"
    | "TIMESTAMP_INVALID"
    | "TIMESTAMP_STALE"
    | "DIGEST_MISMATCH";
  timestampMs?: number;
};

function signatureRequired() {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.MERCADOPAGO_REQUIRE_WEBHOOK_SIGNATURE === "1"
  );
}

function maxSkewMs() {
  const seconds = Number(
    process.env.MERCADOPAGO_WEBHOOK_MAX_SKEW_SECONDS || 300
  );
  const bounded = Number.isFinite(seconds)
    ? Math.min(Math.max(Math.floor(seconds), 30), 1800)
    : 300;
  return bounded * 1000;
}

function parseTimestampMs(value: string) {
  if (!/^\d{10,16}$/.test(value)) return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return null;
  return parsed < 100_000_000_000 ? parsed * 1000 : parsed;
}

export function verifyFreshMercadoPagoSignature(
  signatureHeader: string | null,
  requestId: string | null,
  dataId: string | number | null | undefined,
  nowMs = Date.now()
): MercadoPagoSignatureDecision {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET || "";
  const required = signatureRequired();

  if (!secret) {
    return {
      enforced: required,
      ok: !required,
      reason: required ? "SECRET_MISSING" : "NOT_ENFORCED",
    };
  }
  if (!signatureHeader || !requestId || !dataId) {
    return { enforced: true, ok: false, reason: "HEADERS_MISSING" };
  }

  let timestamp = "";
  let receivedDigest = "";
  for (const part of signatureHeader.split(",")) {
    const separator = part.indexOf("=");
    if (separator < 1) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key === "ts") timestamp = value;
    if (key === "v1") receivedDigest = value;
  }

  if (!timestamp || !/^[a-fA-F0-9]{64}$/.test(receivedDigest)) {
    return {
      enforced: true,
      ok: false,
      reason: "SIGNATURE_FORMAT_INVALID",
    };
  }

  const timestampMs = parseTimestampMs(timestamp);
  if (timestampMs === null) {
    return { enforced: true, ok: false, reason: "TIMESTAMP_INVALID" };
  }
  if (Math.abs(nowMs - timestampMs) > maxSkewMs()) {
    return {
      enforced: true,
      ok: false,
      reason: "TIMESTAMP_STALE",
      timestampMs,
    };
  }

  try {
    const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
    const expectedDigest = crypto
      .createHmac("sha256", secret)
      .update(manifest)
      .digest("hex");
    const received = Buffer.from(receivedDigest, "hex");
    const expected = Buffer.from(expectedDigest, "hex");
    const matches =
      received.length === expected.length &&
      crypto.timingSafeEqual(received, expected);

    return {
      enforced: true,
      ok: matches,
      reason: matches ? "VALID" : "DIGEST_MISMATCH",
      timestampMs,
    };
  } catch {
    return {
      enforced: true,
      ok: false,
      reason: "DIGEST_MISMATCH",
      timestampMs,
    };
  }
}
