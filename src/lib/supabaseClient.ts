import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

/**
 * Cliente Supabase para Client Components.
 * Requiere:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY
 */
export const supabase = createClientComponentClient();