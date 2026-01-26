import "server-only";
import { createClient } from "@supabase/supabase-js";

function mustEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY") {
  const v = process.env[name];
  if (!v) throw new Error(`CONFIG_MISSING:${name}`);
  return v;
}

export const supabaseAdmin = createClient(
  mustEnv("NEXT_PUBLIC_SUPABASE_URL"),
  mustEnv("SUPABASE_SERVICE_ROLE_KEY"),
  {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "X-Client-Info": "chido-casino-admin" } },
  }
);