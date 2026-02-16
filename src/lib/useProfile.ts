"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

export type Profile = {
  id: string;
  user_id: string;
  email: string | null;
  username: string | null;
  avatar_url: string | null;
  role: "user" | "admin";
  vip_level: string | null;
  kyc_status: string | null;
  xp: number;
  referral_code: string | null;
  free_spins?: number;
};

export function useProfile() {
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: sessionData, error: sessionErr } =
        await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;

      const uid = sessionData.session?.user?.id;
      if (!uid) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const { data, error: qErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", uid)
        .maybeSingle();

      if (qErr) throw qErr;
      setProfile((data as Profile) ?? null);
    } catch (e: any) {
      setError(e?.message ?? "Error cargando perfil");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void refresh();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });

    return () => subscription.unsubscribe();
  }, [refresh, supabase]);

  return { profile, loading, error, refresh };
}
