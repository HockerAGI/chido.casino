import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

// Cliente de Supabase para componentes Client.
// - Las credenciales se toman de NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
// - No pases keys aquí: auth-helpers las resuelve automáticamente.
export const supabase = createClientComponentClient();