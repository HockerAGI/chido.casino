import "server-only";
import { createClient } from "@supabase/supabase-js";
import { APP_NAME, APP_SLUG } from "@/lib/appContext";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://example.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "missing-service-role-key";

export function isSupabaseAdminConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export const supabaseAdmin = createClient(
  SUPABASE_URL,
  SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        "X-Client-Info": `chido-casino-admin/${APP_SLUG}`,
        "X-App-Slug": APP_SLUG,
        "X-App-Name": APP_NAME,
      },
    },
  }
);
