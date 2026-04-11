export type HockerOneConfig = {
  baseUrl: string;
  adminToken: string;
};

export function getHockerOneConfig(): HockerOneConfig | null {
  const baseUrl = process.env.NEXT_PUBLIC_HOCKER_ONE_URL || process.env.HOCKER_ONE_URL || "";
  const adminToken = process.env.HOCKER_ONE_ADMIN_TOKEN || "";
  if (!baseUrl || !adminToken) return null;
  return { baseUrl, adminToken };
}

export async function hockerOneFetch(path: string, init: RequestInit = {}) {
  const cfg = getHockerOneConfig();
  if (!cfg) throw new Error("HOCKER_ONE_NOT_CONFIGURED");

  const res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${cfg.adminToken}`,
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  return res;
}