"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useProfile } from "@/lib/useProfile";
import { useWalletBalance } from "@/lib/useWalletBalance";

export default function ProfilePage() {
  const { profile, loading } = useProfile();
  const wallet = useWalletBalance();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function uploadAvatar() {
    if (!avatarFile || !profile) return;

    const path = `${profile.user_id}/avatar.png`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, avatarFile, { upsert: true });

    if (upErr) {
      setMsg(upErr.message);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);

    await supabase
      .from("profiles")
      .update({ avatar_url: data.publicUrl })
      .eq("user_id", profile.user_id);

    setMsg("Avatar actualizado");
  }

  if (loading) return <div className="p-6">Cargando…</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Mi perfil</h1>

      <div className="flex items-center gap-4">
        <img
          src={profile?.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${profile?.user_id}`}
          className="w-20 h-20 rounded-full border"
        />
        <input type="file" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} />
        <button onClick={uploadAvatar} className="px-4 py-2 bg-white text-black rounded">
          Subir avatar
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>Saldo: ${wallet.formatted}</div>
        <div>Bono: ${wallet.formattedBonus}</div>
        <div>Bloqueado: ${wallet.formattedLocked}</div>
      </div>

      <div className="text-sm text-zinc-400">
        Cashback activo: {(profile?.cashback_rate ?? 0) * 100}%
      </div>

      {msg && <div className="text-green-400">{msg}</div>}
    </div>
  );
}