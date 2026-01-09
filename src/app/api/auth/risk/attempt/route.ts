import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

type RiskPayload = {
  a: number;   // attempts
  t: number;   // last timestamp (epoch sec)
  cd: number;  // cooldownUntil (epoch sec)
  eh: string;  // email hash
};

function sign(data: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(data).digest("base64url");
}

function encode(payload: RiskPayload, secret: string) {
  const p = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const s = sign(p, secret);
  return `${p}.${s}`;
}

function decode(token: string, secret: string): RiskPayload | null {
  const [p, s] = token.split(".");
  if (!p || !s) return null;
  const expected = sign(p, secret);
  try {
    if (!crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(p, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function emailHash(email: string) {
  return crypto.createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 16);
}

export async function POST(req: Request) {
  const secret = process.env.RISK_SIGNING_SECRET;

  // Si no configuras secret, no bloquea (modo dev)
  if (!secret) {
    return NextResponse.json({ ok: true, risk: 0, cooldownSeconds: 0 });
  }

  const now = Math.floor(Date.now() / 1000);
  const { email } = await req.json().catch(() => ({ email: "" }));
  const eh = emailHash(String(email || ""));

  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(/chido_risk=([^;]+)/);
  const token = match?.[1] ? decodeURIComponent(match[1]) : null;

  let payload: RiskPayload = { a: 0, t: now, cd: 0, eh };

  if (token) {
    const decoded = decode(token, secret);
    if (decoded) payload = decoded;
  }

  // Si cambia el email, resetea el contador (evita mezclar intentos entre cuentas)
  if (payload.eh !== eh) payload = { a: 0, t: now, cd: 0, eh };

  // cooldown activo
  if (payload.cd && payload.cd > now) {
    const cooldownSeconds = payload.cd - now;
    const risk = Math.min(100, 70 + payload.a * 5);

    const res = NextResponse.json({
      ok: false,
      risk,
      cooldownSeconds,
      message: "Demasiados intentos. Espera el cooldown."
    });

    res.headers.append(
      "Set-Cookie",
      `chido_risk=${encodeURIComponent(encode(payload, secret))}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=86400`
    );
    return res;
  }

  // ventana de 10 minutos: si pasó, baja intentos
  if (now - payload.t > 600) payload.a = 0;

  payload.a += 1;
  payload.t = now;

  // política (orden correcto):
  // 1-3 bajo, 4-6 normal, 7-9 cooldown 60s, 10+ cooldown 180s
  let cooldownSeconds = 0;
  if (payload.a >= 10) {
    payload.cd = now + 180;
    cooldownSeconds = 180;
  } else if (payload.a >= 7) {
    payload.cd = now + 60;
    cooldownSeconds = 60;
  } else {
    payload.cd = 0;
  }

  const risk =
    payload.a <= 3 ? 10 :
    payload.a <= 6 ? 45 :
    payload.a <= 9 ? 75 : 95;

  const ok = cooldownSeconds === 0;

  const res = NextResponse.json({
    ok,
    risk,
    cooldownSeconds,
    message: ok ? undefined : "Protección activa. Espera el cooldown."
  });

  res.headers.append(
    "Set-Cookie",
    `chido_risk=${encodeURIComponent(encode(payload, secret))}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=86400`
  );

  return res;
}