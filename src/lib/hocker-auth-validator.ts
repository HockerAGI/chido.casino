import { createClient } from "@supabase/supabase-js";

export async function validateHockerPortalKey(token: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from("hocker_portal_grants")
    .select("tenant_id, status, expires_at")
    .eq("access_token", token)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .single();

  if (error || !data) return { valid: false, error: "Llave inválida o expirada" };
  return { valid: true, tenantId: data.tenant_id };
}
