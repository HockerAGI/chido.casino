import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase para Client Components.
 * Se mantiene separado por compatibilidad con imports existentes.
 */
export function createClient(): SupabaseClient {
  return createClientComponentClient();
}