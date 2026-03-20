import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import type { Session } from "@supabase/supabase-js";

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export type ServerSession = {
  user: {
    id: string;
    email: string | null | undefined;
  };
  access_token: string | null;
  session: Session;
};

export async function getServerSession(_req?: Request): Promise<ServerSession | null> {
  if (!SUPABASE_CONFIGURED) return null;

  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;

    const session = data.session;
    if (!session || !session.user) return null;

    return {
      user: {
        id: session.user.id,
        email: session.user.email ?? null,
      },
      access_token: session.access_token ?? null,
      session,
    };
  } catch {
    return null;
  }
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
