import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions, CookieMethodsServer } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

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

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

export async function createServerSupabaseClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  const cookieAdapter: CookieMethodsServer = {
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet: CookieToSet[]) {
      try {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      } catch {
        // En Server Components no siempre se pueden escribir cookies.
      }
    },
  };

  return createServerClient(getSupabaseUrl(), getSupabaseKey(), {
    cookies: cookieAdapter,
  });
}