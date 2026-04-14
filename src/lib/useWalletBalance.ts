"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { WALLET_REFRESH_EVENT } from "@/lib/wallet-refresh";

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
    }).format(Number.isFinite(n) ? n : 0);
  } catch {
    return `$${(n ?? 0).toFixed(2)} MXN`;
  }
}

export function useWalletBalance() {
  const supabase = useMemo(() => supabaseBrowser(), []);

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
        .select("balance, bonus_balance, locked_balance")
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
  }, [supabase]);

  useEffect(() => {
    void load();

    const onRefresh = () => void load();
    const onStorage = (event: StorageEvent) => {
      if (event.key === "__chido_wallet_refresh__") void load();
    };

    window.addEventListener(WALLET_REFRESH_EVENT, onRefresh);
    window.addEventListener("storage", onStorage);

    const poll = window.setInterval(() => {
      void load();
    }, 20000);

    return () => {
      window.removeEventListener(WALLET_REFRESH_EVENT, onRefresh);
      window.removeEventListener("storage", onStorage);
      window.clearInterval(poll);
    };
  }, [load]);

  useEffect(() => {
    let channel: any = null;
    let active = true;

    const bindRealtime = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const userId = session?.user?.id;
      if (!active || !userId) return;

      channel = supabase
        .channel(`balances:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "balances",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            void load();
          }
        )
        .subscribe();
    };

    void bindRealtime();

    return () => {
      active = false;
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [load, supabase]);

  useEffect(() => {
    const sub = supabase.auth.onAuthStateChange(() => {
      void load();
    });

    return () => sub.data.subscription.unsubscribe();
  }, [load, supabase]);

  return {
    ...state,
    refresh: load,
  };
}