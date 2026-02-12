"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

let _client: ReturnType<typeof createClientComponentClient> | null = null;

export function supabaseBrowser() {
  if (!_client) _client = createClientComponentClient();
  return _client;
}
