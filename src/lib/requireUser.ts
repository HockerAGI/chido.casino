import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type AuthedUser = {
  id: string;
  email: string | null;
  emailConfirmed: boolean;
};

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function requireUser(req: Request): Promise<AuthedUser> {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  const token = auth && auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) {
    throw new AuthError("No autorizado", 401);
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    throw new AuthError("Sesión inválida", 401);
  }

  const u = data.user as any;
  const emailConfirmed = Boolean(u.email_confirmed_at || u.confirmed_at);
  return { id: u.id, email: u.email ?? null, emailConfirmed };
}
