"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";

const CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let _client: SupabaseClient | null = null;

export function createClient(): SupabaseClient | null {
  if (!CONFIGURED) return null;
  if (!_client) {
    try { _client = createClientComponentClient(); } catch { return null; }
  }
  return _client;
}
