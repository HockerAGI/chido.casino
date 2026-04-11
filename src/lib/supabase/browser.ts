"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

/**
 * Cliente singleton para browser/client hooks.
 */
export function supabaseBrowser(): SupabaseClient {
  if (!_client) {
    _client = createClientComponentClient();
  }
  return _client;
}