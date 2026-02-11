import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

/**
 * Cliente Supabase para Client Components (browser).
 * Usado por helpers como uploadAvatar().
 */
export function createClient() {
  return createClientComponentClient();
}