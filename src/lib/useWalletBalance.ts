"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type State = {
  loading: boolean;
  userId: string | null;
  balance: number;
  currency: "MXN";
  error: string | null;
};

export function useWalletBalance() {
  const [state, setState] = useState<State>({
    loading: true,
    userId: null,
    balance: 0,
    currency: "MXN",
    error: null
  });

  const formatted = useMemo(() => {
    const v = Number.isFinite(state.balance) ? state.balance : 0;
    return v.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, [state.balance]);

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
          setState((s) => ({ ...s, loading: false, userId: null, balance: 0, error: null }));
          return;
        }

        // leer balance inicial
        const { data: bal, error: bErr } = await supabase
          .from("balances")
          .select("balance")
          .eq("user_id", userId)
          .maybeSingle();

        if (!mounted) return;

        setState((s) => ({
          ...s,
          loading: false,
          userId,
          balance: Number(bal?.balance ?? 0),
          error: bErr ? bErr.message : null
        }));

        // realtime: UPDATE/INSERT sobre balances del usuario
        channel = supabase
          .channel(`balances:${userId}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "balances", filter: `user_id=eq.${userId}` },
            (payload) => {
              const next = Number((payload.new as any)?.balance ?? 0);
              setState((s) => ({ ...s, balance: next }));
            }
          )
          .subscribe();
      } catch (e: any) {
        if (!mounted) return;
        setState((s) => ({ ...s, loading: false, error: e?.message ?? "Error wallet" }));
      }
    }

    boot();

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return { ...state, formatted };
}