// src/lib/session.ts
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import type { Session, User } from "@supabase/supabase-js";

export type ServerSession = {
  user: Pick<User, "id" | "email"> & { email: string | null };
  access_token: string | null;
  session: Session;
};

/**
 * getServerSession()
 * Compat layer: algunos endpoints esperan este helper.
 *
 * Nota: el parámetro `req` es opcional y se ignora a propósito,
 * para ser compatible con implementaciones que lo pasan.
 */
export async function getServerSession(_req?: Request): Promise<ServerSession | null> {
  const supabase = createRouteHandlerClient({ cookies });

  const { data, error } = await supabase.auth.getSession();
  if (error) return null;

  const session = data.session;
  if (!session || !session.user) return null;

  return {
    user: { id: session.user.id, email: session.user.email ?? null },
    access_token: session.access_token ?? null,
    session,
  };
}

export async function requireServerSession(req?: Request): Promise<ServerSession> {
  const s = await getServerSession(req);
  if (!s) throw new Error("UNAUTHORIZED");
  return s;
}

export async function getSessionUser(req?: Request): Promise<ServerSession["user"] | null> {
  const s = await getServerSession(req);
  return s?.user ?? null;
}

export async function requireSessionUser(req?: Request): Promise<ServerSession["user"]> {
  const u = await getSessionUser(req);
  if (!u) throw new Error("UNAUTHORIZED");
  return u;
}