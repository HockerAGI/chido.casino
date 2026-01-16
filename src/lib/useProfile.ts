"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export type Profile = {
  user_id: string;
  username: string | null;
  full_name: string | null;
  gender: "male" | "female" | "unknown";
  avatar_url: string | null;
  vip_level: string;
  kyc_status: "unverified" | "pending" | "approved" | "rejected";
  withdraw_clabe: string | null;
  withdraw_name: string | null;
};

const DEFAULT_VIP = "Salsa Verde";

function normalizeProfile(row: any): Profile {
  return {
    user_id: row.user_id,
    username: row.username ?? null,
    full_name: row.full_name ?? null,
    gender: (row.gender === "male" || row.gender === "female") ? row.gender : "unknown",
    avatar_url: row.avatar_url ?? null,
    vip_level: row.vip_level ?? DEFAULT_VIP,
    kyc_status: (row.kyc_status in { unverified: 1, pending: 1, approved: 1, rejected: 1 }) ? row.kyc_status : "unverified",
    withdraw_clabe: row.withdraw_clabe ?? null,
    withdraw_name: row.withdraw_name ?? null
  };
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const avatarUrl = useMemo(() => {
    if (!profile?.user_id) return null;
    if (profile.avatar_url) return profile.avatar_url;
    const seed = profile.username || profile.user_id;
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
  }, [profile]);

  const refresh = async () => {
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setProfile(null);
      setLoading(false);
      return;
    }

    // Bootstrap server-side (service role): crea profile si falta, crea notificación bienvenida, etc.
    await fetch("/api/profile/bootstrap", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${session.access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({})
    }).catch(() => {});

    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, username, full_name, gender, avatar_url, vip_level, kyc_status, withdraw_clabe, withdraw_name")
      .eq("user_id", session.user.id)
      .single();

    if (error || !data) {
      setProfile({
        user_id: session.user.id,
        username: session.user.user_metadata?.username ?? null,
        full_name: session.user.user_metadata?.full_name ?? null,
        gender: "unknown",
        avatar_url: null,
        vip_level: DEFAULT_VIP,
        kyc_status: "unverified",
        withdraw_clabe: null,
        withdraw_name: null
      });
      setLoading(false);
      return;
    }

    setProfile(normalizeProfile(data));
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const { data: sub } = supabase.auth.onAuthStateChange(() => refresh());
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    profile,
    loading,
    avatarUrl,
    refresh,
    kycApproved: profile?.kyc_status === "approved"
  };
}
