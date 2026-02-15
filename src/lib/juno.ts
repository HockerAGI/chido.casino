import crypto from "crypto";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

function mustEnv(key: string) {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env: ${key}`);
  return v;
}

function signJunoRequest(opts: {
  apiKey: string;
  apiSecret: string;
  nonce: string;
  method: HttpMethod;
  requestPath: string; // includes query if any
  jsonPayload: string; // "" if none
}) {
  const { apiKey, apiSecret, nonce, method, requestPath, jsonPayload } = opts;
  const data = `${nonce}${method}${requestPath}${jsonPayload}`;
  const signature = crypto.createHmac("sha256", apiSecret).update(data).digest("hex");
  return `Bitso ${apiKey}:${nonce}:${signature}`;
}

export async function junoRequest<T = any>(method: HttpMethod, path: string, body?: any): Promise<T> {
  const base = mustEnv("JUNO_BASE_URL"); // ej: https://stage.buildwithjuno.com  o tu base prod
  const apiKey = mustEnv("JUNO_API_KEY");
  const apiSecret = mustEnv("JUNO_API_SECRET");

  const url = new URL(path, base);
  const requestPath = `${url.pathname}${url.search}`;

  const nonce = String(Date.now());
  const jsonPayload = body ? JSON.stringify(body) : "";

  const auth = signJunoRequest({
    apiKey,
    apiSecret,
    nonce,
    method,
    requestPath,
    jsonPayload,
  });

  const res = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: auth,
      "content-type": "application/json",
    },
    body: body ? jsonPayload : undefined,
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `Juno error (${res.status})`;
    throw new Error(msg);
  }

  return data as T;
}

export async function junoCreateClabe(): Promise<string> {
  // Create CLABE (Multiple User CLABEs)
  const res = await junoRequest<{ success: boolean; payload?: { clabe?: string } }>(
    "POST",
    "/mint_platform/v1/clabes",
    {}
  );

  const clabe = res?.payload?.clabe;
  if (!clabe) throw new Error("Juno: CLABE no disponible en respuesta");
  return clabe;
}