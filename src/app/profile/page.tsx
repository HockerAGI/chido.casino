"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { Footer } from "@/components/layout/footer";
import { useWalletBalance } from "@/lib/useWalletBalance";
import { User, Award, ShieldCheck, AlertCircle, Camera, UploadCloud } from "lucide-react";
import { useState } from "react";

export default function ProfilePage() {
  const { formatted } = useWalletBalance();
  const [activeTab, setActiveTab] = useState("general");
  const [isEditing, setIsEditing] = useState(false);

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto animate-fade-in px-4">
        
        {/* HEADER */}
        <div className="relative rounded-3xl overflow-hidden bg-zinc-900 border border-white/5 mb-8">
           <div className="h-32 bg-gradient-to-r from-chido-cyan/20 via-chido-pink/20 to-black/50" />
           <div className="px-8 pb-8 flex flex-col md:flex-row items-end -mt-12 gap-6">
              <div className="w-24 h-24 rounded-full border-4 border-[#050510] bg-zinc-800 p-1 relative group">
                 <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${formatted}`} className="w-full h-full rounded-full" alt="Avatar"/>
                 <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                    <Camera size={20} className="text-white"/>
                 </div>
              </div>
              <div className="flex-1 mb-2">
                 <h1 className="text-2xl font-black text-white flex items-center gap-2">
                   Usuario Chido <span className="bg-chido-gold/20 text-chido-gold text-[10px] px-2 py-0.5 rounded-full uppercase border border-chido-gold/30">VIP Nivel 1</span>
                 </h1>
                 <p className="text-zinc-400 text-xs">ID de Jugador: 839210</p>
              </div>
              <button onClick={() => setIsEditing(!isEditing)} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-colors">
                  {isEditing ? "Guardar Cambios" : "Editar Perfil"}
              </button>
           </div>
        </div>

        <div className="grid md:grid-cols-[250px_1fr] gap-8">
           {/* SIDEBAR TABS */}
           <div className="space-y-2">
              <button onClick={() => setActiveTab('general')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'general' ? 'bg-white text-black' : 'text-zinc-400 hover:bg-white/5'}`}><User size={18}/> General</button>
              <button onClick={() => setActiveTab('verification')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'verification' ? 'bg-white text-black' : 'text-zinc-400 hover:bg-white/5'}`}><ShieldCheck size={18}/> Verificación</button>
              <button onClick={() => setActiveTab('vip')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'vip' ? 'bg-white text-black' : 'text-zinc-400 hover:bg-white/5'}`}><Award size={18}/> Nivel VIP</button>
           </div>

           {/* CONTENIDO DINÁMICO */}
           <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-8 min-h-[400px]">
              
              {activeTab === 'general' && (
                  <div className="space-y-6 animate-fade-in">
                    <h2 className="text-xl font-bold mb-4">Información Personal</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase">Correo</label>
                          <input type="text" value="usuario@chido.casino" disabled className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-zinc-400 text-sm cursor-not-allowed" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase">Teléfono</label>
                          <input type="text" placeholder="+52 ..." disabled={!isEditing} className={`w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-chido-cyan outline-none ${isEditing ? 'border-chido-cyan/50' : ''}`} />
                       </div>
                       <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase">Nombre Completo</label>
                          <input type="text" placeholder="Tu nombre" disabled={!isEditing} className={`w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-chido-cyan outline-none ${isEditing ? 'border-chido-cyan/50' : ''}`} />
                       </div>
                    </div>
                  </div>
              )}

              {activeTab === 'verification' && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="flex items-center justify-between p-4 bg-chido-red/10 border border-chido-red/20 rounded-xl">
                       <div className="flex items-center gap-3">
                          <AlertCircle className="text-chido-red" size={20} />
                          <div>
                             <div className="font-bold text-chido-red text-sm">Verificación Pendiente</div>
                             <div className="text-xs text-chido-red/70">Sube tu INE para habilitar retiros.</div>
                          </div>
                       </div>
                    </div>

                    <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-white/5 transition-colors cursor-pointer">
                        <UploadCloud size={40} className="text-zinc-500 mb-4" />
                        <h3 className="font-bold text-white mb-1">Sube tu Identificación Oficial</h3>
                        <p className="text-xs text-zinc-500">INE, Pasaporte o Licencia (Frente y Reverso)</p>
                    </div>
                  </div>
              )}

              {activeTab === 'vip' && (
                  <div className="text-center py-8 animate-fade-in">
                    <Award size={60} className="text-chido-gold mx-auto mb-4 drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]" />
                    <h2 className="text-2xl font-black text-white">Salsa Verde</h2>
                    <p className="text-zinc-400 mb-6">Nivel Inicial</p>
                    
                    <div className="bg-black/40 rounded-full h-4 w-full max-w-md mx-auto overflow-hidden relative mb-2">
                       <div className="absolute top-0 left-0 h-full w-[25%] bg-gradient-to-r from-chido-green to-emerald-400"></div>
                    </div>
                    <p className="text-xs text-zinc-500">250 / 1000 XP para siguiente nivel</p>
                  </div>
              )}
           </div>
        </div>
      </div>
      <div className="mt-20"><Footer /></div>
    </MainLayout>
  );
}
