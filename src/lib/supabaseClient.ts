"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";

// ⚠️ No crear el cliente en module-scope.
// En Next (App Router) eso puede disparar "cookies()" durante el build/static.
let _client: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (!_client) _client = createClientComponentClient();
  return _client;
}
