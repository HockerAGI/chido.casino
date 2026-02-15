"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

/**
 * Cliente Supabase para Client Components.
 * Importante: NO instanciar en module-scope para evitar `cookies()` en build.
 */
export function createClient(): SupabaseClient {
  if (_client) return _client;
  _client = createClientComponentClient();
  return _client;
}