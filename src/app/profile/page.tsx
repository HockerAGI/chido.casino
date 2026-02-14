"use client";

// FIX: Evita errores de build por uso de cookies/auth
export const dynamic = "force-dynamic";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useProfile } from "@/lib/useProfile";
import { useWalletBalance } from "@/lib/useWalletBalance";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCircle, Upload, ShieldCheck, CreditCard } from "lucide-react";

export default function ProfilePage() {
  const { profile, loading } = useProfile();
  const wallet = useWalletBalance();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function uploadAvatar() {
    if (!avatarFile || !profile) return;
    setUploading(true);

    const path = `${profile.user_id}/avatar.png`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, avatarFile, { upsert: true });

    if (upErr) {
      setMsg("Error: " + upErr.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);

    // Truco: añadir timestamp para romper caché de imagen
    const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

    await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("user_id", profile.user_id);

    setMsg("Avatar actualizado correctamente");
    setUploading(false);
    window.location.reload(); // Recarga simple para ver cambios
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-zinc-500">Cargando perfil...</div>;

  return (
    <div className="min-h-screen pb-20 animate-fade-in max-w-4xl mx-auto">
      
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Mi Perfil</h1>
        <p className="text-zinc-400">Gestiona tu identidad y seguridad.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        
        {/* TARJETA DE IDENTIDAD */}
        <Card className="bg-[#1A1A1D] border-white/5 p-6 rounded-2xl md:col-span-1 flex flex-col items-center text-center">
           <div className="relative w-32 h-32 mb-4">
             <img
               src={profile?.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${profile?.user_id}`}
               className="w-full h-full rounded-full border-4 border-[#121214] shadow-xl object-cover bg-zinc-800"
               alt="Avatar"
             />
             <div className="absolute bottom-0 right-0 p-2 bg-[#00F0FF] rounded-full text-black cursor-pointer hover:scale-110 transition-transform shadow-lg">
                <label htmlFor="avatar-upload" className="cursor-pointer">
                   <Upload size={16} />
                </label>
                <input 
                  id="avatar-upload" 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                />
             </div>
           </div>
           
           <h2 className="text-xl font-bold text-white mb-1">{profile?.full_name || "Usuario"}</h2>
           <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold border border-emerald-500/20 mb-4">
              <ShieldCheck size={12} /> Verificado
           </div>

           {avatarFile && (
             <Button onClick={uploadAvatar} disabled={uploading} className="w-full bg-white text-black hover:bg-zinc-200 mb-2">
               {uploading ? "Subiendo..." : "Guardar Foto"}
             </Button>
           )}
           {msg && <p className="text-xs text-[#00F0FF] mt-2">{msg}</p>}
        </Card>

        {/* TARJETA DE BILLETERA */}
        <Card className="bg-[#1A1A1D] border-white/5 p-6 rounded-2xl md:col-span-2">
           <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
              <CreditCard className="text-[#00F0FF]" />
              <h3 className="font-bold text-white">Resumen de Bóveda</h3>
           </div>

           <div className="grid grid-cols-3 gap-4">
              <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                 <div className="text-xs text-zinc-500 uppercase font-bold mb-1">Saldo Real</div>
                 <div className="text-xl font-mono font-bold text-white">${wallet.formatted}</div>
              </div>
              <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                 <div className="text-xs text-zinc-500 uppercase font-bold mb-1">Bono</div>
                 <div className="text-xl font-mono font-bold text-[#FF0099]">${wallet.formattedBonus || "0.00"}</div>
              </div>
              <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                 <div className="text-xs text-zinc-500 uppercase font-bold mb-1">En Juego</div>
                 <div className="text-xl font-mono font-bold text-zinc-400">${wallet.formattedLocked || "0.00"}</div>
              </div>
           </div>

           <div className="mt-6 p-4 bg-[#00F0FF]/5 rounded-xl border border-[#00F0FF]/10 flex justify-between items-center">
              <div>
                <div className="text-sm font-bold text-[#00F0FF]">Nivel de Cashback</div>
                <div className="text-xs text-zinc-400">Basado en tu juego mensual</div>
              </div>
              <div className="text-2xl font-black text-white">
                {(profile?.cashback_rate ?? 0) * 100}%
              </div>
           </div>
        </Card>

      </div>
    </div>
  );
}
