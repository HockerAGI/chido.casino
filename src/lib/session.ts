import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ServerSession = {
  user: {
    id: string;
    email: string | null | undefined;
  };
  access_token: string | null;
  session: {
    user: {
      id: string;
      email: string | null | undefined;
    };
    access_token: string | null;
  } | null;
};

export async function getServerSession(_req?: Request): Promise<ServerSession | null> {
  try {
    const supabase = createServerSupabaseClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return null;

    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session ?? null;

    return {
      user: {
        id: userData.user.id,
        email: userData.user.email ?? null,
      },
      access_token: session?.access_token ?? null,
      session: session
        ? {
            user: {
              id: userData.user.id,
              email: userData.user.email ?? null,
            },
            access_token: session.access_token ?? null,
          }
        : null,
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