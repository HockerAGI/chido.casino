import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

// IMPORTANTE: No uses 'process.env' directo aquí si usas esta librería, 
// ella lo detecta sola, pero pasarlo explícitamente asegura que no falle.
export const supabase = createClientComponentClient({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});