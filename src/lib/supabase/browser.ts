"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./client";

export function supabaseBrowser(): SupabaseClient {
  return createClient();
}