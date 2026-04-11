// src/lib/appContext.ts
export const APP_SLUG = process.env.NEXT_PUBLIC_APP_SLUG?.trim() || "chido-casino";
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Chido Casino";
export const PORTAL_SLUG = process.env.NEXT_PUBLIC_PORTAL_SLUG?.trim() || "hocker-one";
export const SHARED_SUPABASE_PROJECT = true;

export const IS_CHIDO_CASINO = APP_SLUG === "chido-casino";
export const IS_HOCKER_ONE = APP_SLUG === "hocker-one";

export function appContextHeaders(init: HeadersInit = {}) {
  return {
    ...init,
    "x-app-slug": APP_SLUG,
    "x-app-name": APP_NAME,
  };
}