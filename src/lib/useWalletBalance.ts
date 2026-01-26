"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type State = {
  loading: boolean;
  userId: string | null;
  balance: number;
  bonusBalance: number;
  lockedBalance: number;
  currency: "MXN";
  error: string | null;
};

function fmt(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function useWalletBalance() {
  const [state, setState] = useState<State>({
    loading: true,
    userId: null,
    balance: 0,
    bonusBalance: 0,
    lockedBalance: 0,
    currency: "MXN",
    error: null,
  });

  const formatted = useMemo(() => fmt(state.balance), [state.balance]);
  const formattedBonus = useMemo(() => fmt(state.bonusBalance), [state.bonusBalance]);
  const formattedLocked = useMemo(() => fmt(state.lockedBalance), [state.lockedBalance]);

  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function boot() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const userId = data.session?.user?.id ?? null;

        if (!mounted) return;

        if (!userId) {
          setState((s) => ({
            ...s,
            loading: false,
            userId: null,
            balance: 0,
            bonusBalance: 0,
            lockedBalance: 0,
            error: null,
          }));
          return;
        }

        const { data: bal, error: bErr } = await supabase
          .from("balances")
          .select("balance, bonus_balance, locked_balance, currency")
          .eq("user_id", userId)
          .maybeSingle();

        if (!mounted) return;

        setState({
          loading: false,
          userId,
          balance: Number(bal?.balance ?? 0),
          bonusBalance: Number(bal?.bonus_balance ?? 0),
          lockedBalance: Number(bal?.locked_balance ?? 0),
          currency: "MXN",
          error: bErr ? bErr.message : null,
        });

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
            (payload) => {
              const next = payload.new as any;
              setState((s) => ({
                ...s,
                balance: Number(next?.balance ?? s.balance),
                bonusBalance: Number(next?.bonus_balance ?? s.bonusBalance),
                lockedBalance: Number(next?.locked_balance ?? s.lockedBalance),
              }));
            }
          )
          .subscribe();
      } catch (e: any) {
        if (!mounted) return;
        setState((s) => ({
          ...s,
          loading: false,
          error: e?.message || "Error wallet",
        }));
      }
    }

    boot();

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return {
    ...state,
    formatted,
    formattedBonus,
    formattedLocked,
  };
}