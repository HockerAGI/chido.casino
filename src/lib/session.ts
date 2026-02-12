import { requireUser, type AuthedUser } from "@/lib/requireUser";

/**
 * Compat layer: algunos endpoints o ramas del repo importan `@/lib/session`.
 * Este archivo evita que el build truene y centraliza el auth actual.
 */

export type SessionUser = AuthedUser;

export async function getSessionUser(req: Request): Promise<SessionUser> {
  return requireUser(req);
}

/**
 * Alias clásico.
 * Si algún archivo hace `import { requireSession } from "@/lib/session"`
 * esto sigue funcionando.
 */
export async function requireSession(req: Request): Promise<SessionUser> {
  return requireUser(req);
}

/**
 * Alias minimalista por compat.
 * Si algún endpoint hace `const session = await getSession(req)`
 */
export async function getSession(req: Request): Promise<SessionUser> {
  return requireUser(req);
}
