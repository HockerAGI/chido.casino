import "server-only";

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const PROJECT_ID = "chido-casino";
const PROFILE_ADMIN_ROLES = new Set(["admin", "owner", "super_admin"]);
const PROJECT_ADMIN_ROLES = new Set(["admin", "owner"]);

export type AdminContext = {
  userId: string;
  email: string | null | undefined;
  source: "profiles" | "project_members" | "portal_grants" | "legacy_token";
  role: string | null;
};

export type RequireAdminResult =
  | { ok: true; admin: AdminContext }
  | { ok: false; response: NextResponse };

function unauthorized(status = 401, error = "Unauthorized") {
  return NextResponse.json({ ok: false, error }, { status });
}

function norm(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function list(value: unknown): string[] {
  return Array.isArray(value) ? value.map(norm).filter(Boolean) : [];
}

function grantCovers(row: any, permission: string) {
  const modules = list(row?.modules);
  const permissions = list(row?.permissions);
  const wanted = norm(permission);

  const moduleOk =
    modules.includes("*") ||
    modules.includes("admin") ||
    modules.includes(PROJECT_ID) ||
    modules.includes("chido") ||
    modules.includes("chido_casino");

  const permissionOk =
    permissions.includes("*") ||
    permissions.includes("admin") ||
    permissions.includes(wanted) ||
    permissions.includes(wanted.split(":")[0]);

  return moduleOk && permissionOk;
}

function grantIsActive(row: any) {
  if (norm(row?.status) !== "active") return false;
  if (row?.revoked_at) return false;
  if (!row?.expires_at) return true;

  const expires = new Date(row.expires_at).getTime();
  return Number.isFinite(expires) && expires > Date.now();
}

async function requireAdminFromSession(req: Request, permission: string): Promise<RequireAdminResult> {
  const session = await getServerSession(req);
  if (!session?.user?.id) {
    return { ok: false, response: unauthorized() };
  }

  const userId = session.user.id;
  const email = session.user.email ?? null;

  const profile = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (!profile.error && PROFILE_ADMIN_ROLES.has(norm(profile.data?.role))) {
    return {
      ok: true,
      admin: { userId, email, source: "profiles", role: String(profile.data?.role || "") },
    };
  }

  const member = await supabaseAdmin
    .from("project_members")
    .select("role")
    .eq("project_id", PROJECT_ID)
    .eq("user_id", userId)
    .maybeSingle();

  if (!member.error && PROJECT_ADMIN_ROLES.has(norm(member.data?.role))) {
    return {
      ok: true,
      admin: { userId, email, source: "project_members", role: String(member.data?.role || "") },
    };
  }

  if (email) {
    const grants = await supabaseAdmin
      .from("hocker_portal_grants")
      .select("modules, permissions, status, revoked_at, expires_at")
      .eq("grantee_email", email);

    if (!grants.error) {
      const match = (grants.data || []).find((row: any) => grantIsActive(row) && grantCovers(row, permission));
      if (match) {
        return {
          ok: true,
          admin: { userId, email, source: "portal_grants", role: "grant" },
        };
      }
    }
  }

  return { ok: false, response: unauthorized(403, "Forbidden") };
}

function requireLegacyToken(req: Request): RequireAdminResult {
  if (process.env.ALLOW_LEGACY_ADMIN_TOKEN !== "1") {
    return { ok: false, response: unauthorized() };
  }

  const expected = process.env.ADMIN_API_TOKEN || "";
  const token = req.headers.get("x-admin-token") || "";
  if (!expected || token !== expected) {
    return { ok: false, response: unauthorized() };
  }

  return {
    ok: true,
    admin: {
      userId: "legacy-admin-token",
      email: null,
      source: "legacy_token",
      role: "legacy",
    },
  };
}

export async function requireAdmin(req: Request, permission = "admin"): Promise<RequireAdminResult> {
  const sessionResult = await requireAdminFromSession(req, permission);
  if (sessionResult.ok) return sessionResult;

  const legacy = requireLegacyToken(req);
  if (legacy.ok) return legacy;

  return sessionResult;
}

export async function auditAdminAction(
  admin: AdminContext,
  action: string,
  payload: Record<string, any>
) {
  try {
    await supabaseAdmin.from("transactions_audit").insert({
      transaction_id: null,
      changed_by: admin.userId,
      action,
      payload: {
        ...payload,
        admin_source: admin.source,
        admin_role: admin.role,
        admin_email: admin.email,
        at: new Date().toISOString(),
      },
    } as any);
  } catch {
    // Admin actions must not fail because optional audit storage is unavailable.
  }
}
