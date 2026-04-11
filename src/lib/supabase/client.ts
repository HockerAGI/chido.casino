"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("SUPABASE_URL_NOT_CONFIGURED");
  return url;
}

function getSupabaseKey() {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!key) throw new Error("SUPABASE_KEY_NOT_CONFIGURED");
  return key;
}

export function createClient(): SupabaseClient {
  if (!browserClient) {
    browserClient = createBrowserClient(getSupabaseUrl(), getSupabaseKey());
  }
  return browserClient;
}