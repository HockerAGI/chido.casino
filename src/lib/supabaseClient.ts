import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

/**
 * Cliente Supabase (browser).
 * - `createClient()` para componentes que necesitan instanciar el client.
 * - `supabase` para uso rápido (compat con tu repo actual).
 */
export function createClient() {
  return createClientComponentClient();
}

export const supabase = createClient();