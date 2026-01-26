"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export type Profile = {
  user_id: string;
  username: string | null;
  full_name: string | null;
  gender: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  kyc_status: string | null;
  cashback_rate: number;
};

type State = {
  loading: boolean;
  userId: string | null;
  profile: Profile | null;
  error: string | null;
};

export function useProfile() {
  const [state, setState] = useState<State>({
    loading: true,
    userId: null,
    profile: null,
    error: null,
  });

  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function boot() {
      try {
        const { data } = await supabase.auth.getSession();
        const userId = data.session?.user?.id ?? null;

        if (!mounted) return;

        if (!userId) {
          setState({ loading: false, userId: null, profile: null, error: null });
          return;
        }

        const { data: p, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (!mounted) return;

        setState({
          loading: false,
          userId,
          profile: p as Profile,
          error: error ? error.message : null,
        });

        channel = supabase
          .channel(`profiles:${userId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "profiles",
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              setState((s) => ({
                ...s,
                profile: payload.new as Profile,
              }));
            }
          )
          .subscribe();
      } catch (e: any) {
        if (!mounted) return;
        setState((s) => ({
          ...s,
          loading: false,
          error: e?.message || "Error perfil",
        }));
      }
    }

    boot();

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return state;
}