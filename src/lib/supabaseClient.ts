"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

// Supabase client para el navegador.
// Lee NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY automáticamente.
export const supabase = createClientComponentClient();
