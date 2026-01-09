import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

// Este cliente usa cookies automáticamente, permitiendo que el Middleware
// vea la sesión que se crea en el login.
export const supabase = createClientComponentClient({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});