type JsonObject = Record<string, unknown>;

const PROJECT_ID = "chido-casino";
const NODE_ID = "chido-casino-web";

function env(...keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return "";
}

function supabaseConfig() {
  const url = env("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL").replace(/\/$/, "");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");

  return { url, key, configured: Boolean(url && key) };
}

async function supabaseFetch(path: string, init: RequestInit = {}) {
  const cfg = supabaseConfig();

  if (!cfg.configured) {
    throw new Error("Supabase no configurado.");
  }

  const headers = new Headers(init.headers);
  headers.set("apikey", cfg.key);
  headers.set("Authorization", `Bearer ${cfg.key}`);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${cfg.url}/rest/v1/${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}

export async function checkSupabaseTable(table: string): Promise<boolean> {
  try {
    const res = await supabaseFetch(`${table}?select=*&limit=1`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function upsertChidoPresence(args: {
  status: "online" | "degraded" | "offline";
  meta: JsonObject;
}): Promise<void> {
  const now = new Date().toISOString();

  const body = [
    {
      id: NODE_ID,
      project_id: PROJECT_ID,
      name: "Chido Casino Web",
      type: "app",
      status: args.status,
      last_seen_at: now,
      updated_at: now,
      meta: {
        ...args.meta,
        source: "chido.casino",
        node_id: NODE_ID,
        project_id: PROJECT_ID,
      },
    },
  ];

  const res = await supabaseFetch("nodes?on_conflict=id", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`No se pudo registrar presencia Chido: ${res.status}`);
  }
}

export async function recordChidoEvent(args: {
  type: string;
  message: string;
  level?: "info" | "warning" | "error";
  data?: JsonObject;
}): Promise<void> {
  const body = [
    {
      project_id: PROJECT_ID,
      node_id: NODE_ID,
      level: args.level ?? "info",
      type: args.type,
      message: args.message,
      data: {
        ...(args.data ?? {}),
        source: "chido.casino",
        node_id: NODE_ID,
      },
    },
  ];

  const res = await supabaseFetch("events", {
    method: "POST",
    headers: {
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`No se pudo registrar evento Chido: ${res.status}`);
  }
}

export { NODE_ID, PROJECT_ID };
