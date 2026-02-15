"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

type ProfileRow = {
  user_id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  cashback_rate?: number | null;
  kyc_status?: string | null;
  is_verified?: boolean | null;
  [key: string]: any;
};

export function useProfile() {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const {
        data: { session },
        error: sErr,
      } = await supabase.auth.getSession();

      if (sErr) throw sErr;

      const uid = session?.user?.id ?? null;
      setUserId(uid);

      if (!uid) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const { data, error: pErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", uid)
        .maybeSingle();

      if (pErr) throw pErr;

      setProfile((data as any) ?? null);
      setLoading(false);
    } catch (e: any) {
      setLoading(false);
      setError(e?.message ?? "Error al cargar perfil");
    }
  }, [supabase]);

  useEffect(() => {
    let channel: any;

    (async () => {
      await refresh();

      if (!userId) return;

      channel = supabase
        .channel(`profiles_${userId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "profiles", filter: `user_id=eq.${userId}` },
          (payload: any) => {
            const next = payload?.new ?? null;
            if (next) setProfile(next as ProfileRow);
          }
        )
        .subscribe();
    })();

    return () => {
      try {
        if (channel) supabase.removeChannel(channel);
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return { userId, profile, loading, error, refresh };
}