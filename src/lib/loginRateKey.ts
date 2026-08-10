import "server-only";

import crypto from "node:crypto";

function requestIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  return (
    forwarded.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

export function normalizedLoginEmail(value: unknown) {
  const email = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function loginRateKey(req: Request, email: string) {
  const material = `${email}|${requestIp(req)}`;
  const digest = crypto
    .createHash("sha256")
    .update(material)
    .digest("hex");
  return `auth:login:${digest}`;
}
