"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const bootstrapAttemptedRef = useRef<string | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bootstrapProfile = useCallback(async (userId: string) => {
    if (bootstrapAttemptedRef.current === userId) return;
    bootstrapAttemptedRef.current = userId;

    try {
      await fetch("/api/profile/bootstrap", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
      });
    } catch {
      // no-op
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!supabase) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
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

      if (!data) {
        await bootstrapProfile(uid);

        const { data: refetched, error: refetchErr } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", uid)
          .maybeSingle();

        if (refetchErr) throw refetchErr;
        setProfile((refetched as Profile) ?? null);
      } else {
        setProfile(data as Profile);
      }
    } catch (e: any) {
      setError(e?.message ?? "Error cargando perfil");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [bootstrapProfile, supabase]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

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