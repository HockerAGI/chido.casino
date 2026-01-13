"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { useWalletBalance } from "@/lib/useWalletBalance";
import { ShieldCheck, User, Lock, CheckCircle2, AlertCircle, Award } from "lucide-react";
import { useState } from "react";

export default function ProfilePage() {
  const { formatted } = useWalletBalance();
  const [activeTab, setActiveTab] = useState("general");

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto animate-fade-in">
        
        {/* HEADER PERFIL */}
        <div className="relative rounded-3xl overflow-hidden bg-zinc-900 border border-white/5 mb-8">
           <div className="h-32 bg-gradient-to-r from-chido-cyan/20 via-chido-pink/20 to-black/50" />
           <div className="px-8 pb-8 flex flex-col md:flex-row items-end -mt-12 gap-6">
              <div className="w-24 h-24 rounded-full border-4 border-[#050510] bg-zinc-800 p-1 relative z-10">
                 <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${formatted}`} className="w-full h-full rounded-full" alt="Avatar"/>
                 <div className="absolute bottom-0 right-0 w-6 h-6 bg-chido-green rounded-full border-4 border-[#050510]" title="Online" />
              </div>
              <div className="flex-1 mb-2">
                 <h1 className="text-2xl font-black text-white flex items-center gap-2">
                   Usuario Chido <span className="bg-chido-gold/20 text-chido-gold text-[10px] px-2 py-0.5 rounded-full uppercase border border-chido-gold/30">VIP Nivel 1</span>
                 </h1>
                 <p className="text-zinc-400 text-xs">Miembro desde 2026</p>
              </div>
           </div>
        </div>

        {/* CONTENIDO TABS */}
        <div className="grid md:grid-cols-[250px_1fr] gap-8">
           <div className="space-y-2">
              {[
                {id: 'general', label: 'General', icon: User},
                {id: 'verification', label: 'Verificación (KYC)', icon: ShieldCheck},
                {id: 'vip', label: 'Nivel VIP', icon: Award},
              ].map(tab => (
                 <button 
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id)}
                   className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-white text-black shadow-lg' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
                 >
                   <tab.icon size={18} /> {tab.label}
                 </button>
              ))}
           </div>

           <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-8 min-h-[400px]">
              
              {activeTab === 'general' && (
                 <div className="space-y-6 animate-fade-in">
                    <h2 className="text-xl font-bold mb-4">Información Personal</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase">Correo</label>
                          <input type="text" value="usuario@chido.casino" disabled className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-zinc-400 text-sm" />
                       </div>
                    </div>
                 </div>
              )}

              {activeTab === 'verification' && (
                 <div className="space-y-6 animate-fade-in">
                    <div className="flex items-center justify-between mb-4">
                       <h2 className="text-xl font-bold">Verificación de Identidad</h2>
                       <span className="px-3 py-1 bg-chido-red/10 text-chido-red text-xs font-black uppercase rounded-full border border-chido-red/20 flex items-center gap-1">
                          <AlertCircle size={12}/> Pendiente
                       </span>
                    </div>
                    <p className="text-sm text-zinc-400 mb-6">Para retirar tus ganancias sin límites, necesitamos validar que eres tú. Es rápido y seguro con Vertx Security.</p>
                 </div>
              )}

              {activeTab === 'vip' && (
                 <div className="text-center py-8 animate-fade-in">
                    <div className="w-24 h-24 mx-auto bg-gradient-to-tr from-chido-green to-emerald-800 rounded-full flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(50,205,50,0.3)] border-4 border-[#050510]">
                       <Award size={40} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-2">Salsa Verde</h2>
                    <p className="text-zinc-400 text-sm mb-8 max-w-xs mx-auto">Tu nivel actual. Juega más para subir a <strong>Serrano</strong> y desbloquear Rakeback del 5%.</p>
                 </div>
              )}

           </div>
        </div>
      </div>
    </MainLayout>
  );
}
