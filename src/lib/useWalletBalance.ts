"use client";

import { useEffect, useState, useCallback } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type WalletState = {
  userId: string | null;
  loading: boolean;
  error: string | null;
  balance: number;
  bonusBalance: number;
  lockedBalance: number;
  currency: "MXN";
  formatted: string;
  formattedBonus: string;
  formattedLocked: string;
};

function formatMXN(n: number) {
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `$${(n ?? 0).toFixed(2)} MXN`;
  }
}

export function useWalletBalance() {
  const [state, setState] = useState<WalletState>({
    userId: null,
    loading: true,
    error: null,
    balance: 0,
    bonusBalance: 0,
    lockedBalance: 0,
    currency: "MXN",
    formatted: formatMXN(0),
    formattedBonus: formatMXN(0),
    formattedLocked: formatMXN(0),
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const supabase = supabaseBrowser();
      const {
        data: { session },
        error: sessionErr,
      } = await supabase.auth.getSession();

      if (sessionErr) throw sessionErr;

      const userId = session?.user?.id ?? null;
      if (!userId) {
        setState((s) => ({
          ...s,
          userId: null,
          loading: false,
          balance: 0,
          bonusBalance: 0,
          lockedBalance: 0,
          formatted: formatMXN(0),
          formattedBonus: formatMXN(0),
          formattedLocked: formatMXN(0),
        }));
        return;
      }

      const { data, error } = await supabase
        .from("balances")
        .select("balance,bonus_balance,locked_balance")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;

      const balance = Number(data?.balance ?? 0);
      const bonusBalance = Number(data?.bonus_balance ?? 0);
      const lockedBalance = Number(data?.locked_balance ?? 0);

      setState((s) => ({
        ...s,
        userId,
        loading: false,
        balance,
        bonusBalance,
        lockedBalance,
        formatted: formatMXN(balance),
        formattedBonus: formatMXN(bonusBalance),
        formattedLocked: formatMXN(lockedBalance),
      }));
    } catch (e: any) {
      setState((s) => ({
        ...s,
        loading: false,
        error: e?.message ?? "Error al cargar balance",
      }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return {
    ...state,
    refresh: load, // 👈 esto desbloquea taco-slot y cualquier “refetch”
  };
}
