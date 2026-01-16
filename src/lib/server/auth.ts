import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type AuthedUser = { id: string; email?: string | null };

export function getBearerToken(req: Request): string | null {
  const raw = req.headers.get("authorization") || "";
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

export async function requireUserFromBearer(req: Request): Promise<AuthedUser> {
  const token = getBearerToken(req);
  if (!token) throw new Error("UNAUTHORIZED");

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) throw new Error("UNAUTHORIZED");

  return { id: data.user.id, email: data.user.email };
}