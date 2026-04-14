"use client";

export const WALLET_REFRESH_EVENT = "chido:wallet-refresh";

export function triggerWalletRefresh() {
  if (typeof window === "undefined") return;

  try {
    window.dispatchEvent(new Event(WALLET_REFRESH_EVENT));
  } catch {
    // ignore
  }

  try {
    localStorage.setItem("__chido_wallet_refresh__", String(Date.now()));
  } catch {
    // ignore
  }
}