import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

/**
 * Cliente de Supabase para browser/client-side.
 * Se usa por helpers como uploadAvatar.
 */
export function createClient() {
  return createClientComponentClient();
}