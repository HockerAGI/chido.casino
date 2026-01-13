"use client";
import { MainLayout } from "@/components/layout/main-layout";
import { useWalletBalance } from "@/lib/useWalletBalance";
import { User, Award, ShieldCheck, AlertCircle } from "lucide-react";
import { useState } from "react";

export default function ProfilePage() {
  const { formatted } = useWalletBalance();
  const [activeTab, setActiveTab] = useState("general");

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto animate-fade-in">
        <div className="relative rounded-3xl overflow-hidden bg-zinc-900 border border-white/5 mb-8">
           <div className="h-32 bg-gradient-to-r from-chido-cyan/20 via-chido-pink/20 to-black/50" />
           <div className="px-8 pb-8 flex items-end -mt-12 gap-6">
              <div className="w-24 h-24 rounded-full border-4 border-[#050510] bg-zinc-800 p-1">
                 <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${formatted}`} className="w-full h-full rounded-full" alt="Avatar"/>
              </div>
              <div className="mb-2"><h1 className="text-2xl font-black text-white">Usuario Chido</h1></div>
           </div>
        </div>
        <div className="grid md:grid-cols-[250px_1fr] gap-8">
           <div className="space-y-2">
              <button onClick={() => setActiveTab('general')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold ${activeTab === 'general' ? 'bg-white text-black' : 'text-zinc-400'}`}><User size={18}/> General</button>
              <button onClick={() => setActiveTab('vip')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold ${activeTab === 'vip' ? 'bg-white text-black' : 'text-zinc-400'}`}><Award size={18}/> VIP</button>
           </div>
           <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-8 min-h-[400px]">
              {activeTab === 'general' && (
                  <div>
                    <h2 className="text-xl font-bold mb-4">Información Personal</h2>
                    <input type="text" value="usuario@chido.casino" disabled className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-zinc-400 text-sm" />
                  </div>
              )}
              {activeTab === 'vip' && (
                  <div className="text-center">
                    <Award size={60} className="text-chido-gold mx-auto mb-4" />
                    <h2 className="text-2xl font-black text-white">Salsa Verde</h2>
                    <p className="text-zinc-400 mb-4">Juega más para subir de nivel.</p>
                    <div className="text-xs text-zinc-500 uppercase font-bold border border-white/10 p-2 rounded inline-block">Atención VIP: Chido Gerente (Solo Habanero)</div>
                  </div>
              )}
           </div>
        </div>
      </div>
    </MainLayout>
  );
}