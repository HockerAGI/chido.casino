"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { useWalletBalance } from "@/lib/useWalletBalance";
import { ShieldCheck, User, CreditCard, Lock, CheckCircle2, AlertCircle, Award } from "lucide-react";
import { useState } from "react";

export default function ProfilePage() {
  const { formatted, loading } = useWalletBalance();
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
                 <p className="text-zinc-400 text-xs">Miembro desde 2026 · ID: 839210</p>
              </div>
              <div className="flex gap-3 mb-2">
                 <button className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-colors">Editar</button>
                 <button className="px-4 py-2 bg-chido-cyan/10 text-chido-cyan border border-chido-cyan/20 rounded-xl text-xs font-bold hover:bg-chido-cyan/20 transition-colors">Verificar</button>
              </div>
           </div>
        </div>

        {/* CONTENIDO TABS */}
        <div className="grid md:grid-cols-[250px_1fr] gap-8">
           {/* Sidebar Tabs */}
           <div className="space-y-2">
              {[
                {id: 'general', label: 'General', icon: User},
                {id: 'verification', label: 'Verificación (KYC)', icon: ShieldCheck},
                {id: 'security', label: 'Seguridad', icon: Lock},
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

           {/* Panels */}
           <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-8 min-h-[400px]">
              
              {activeTab === 'general' && (
                 <div className="space-y-6 animate-fade-in">
                    <h2 className="text-xl font-bold mb-4">Información Personal</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase">Correo</label>
                          <input type="text" value="usuario@chido.casino" disabled className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-zinc-400 text-sm" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase">Teléfono</label>
                          <input type="text" placeholder="+52 ..." className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-chido-cyan outline-none" />
                       </div>
                    </div>
                    <div className="pt-6 border-t border-white/5">
                       <h3 className="font-bold mb-4 text-sm text-zinc-300">Preferencias</h3>
                       <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl mb-2">
                          <span className="text-sm">Notificaciones de Bonos</span>
                          <div className="w-10 h-5 bg-chido-green rounded-full relative cursor-pointer"><div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm"/></div>
                       </div>
                       <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl">
                          <span className="text-sm">Sonido en Juegos</span>
                          <div className="w-10 h-5 bg-zinc-700 rounded-full relative cursor-pointer"><div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm"/></div>
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
                    
                    <div className="space-y-4">
                       <div className="p-4 border border-chido-green/20 bg-chido-green/5 rounded-xl flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full bg-chido-green/20 flex items-center justify-center text-chido-green"><CheckCircle2 size={16}/></div>
                          <div>
                             <div className="text-sm font-bold text-white">Paso 1: Correo Confirmado</div>
                             <div className="text-xs text-zinc-500">Completado el 12/01/2026</div>
                          </div>
                       </div>
                       <div className="p-4 border border-white/5 bg-black/20 rounded-xl flex items-center gap-4 opacity-50">
                          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500">2</div>
                          <div className="flex-1">
                             <div className="text-sm font-bold text-white">Paso 2: Documento (INE/Pasaporte)</div>
                             <div className="text-xs text-zinc-500">Sube una foto clara</div>
                          </div>
                          <button className="px-3 py-1 bg-white text-black text-xs font-bold rounded-lg hover:bg-zinc-200">Iniciar</button>
                       </div>
                    </div>
                 </div>
              )}

              {activeTab === 'vip' && (
                 <div className="text-center py-8 animate-fade-in">
                    <div className="w-24 h-24 mx-auto bg-gradient-to-tr from-chido-green to-emerald-800 rounded-full flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(50,205,50,0.3)] border-4 border-[#050510]">
                       <Award size={40} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-2">Salsa Verde</h2>
                    <p className="text-zinc-400 text-sm mb-8 max-w-xs mx-auto">Tu nivel actual. Juega más para subir a <strong>Serrano</strong> y desbloquear Rakeback del 5%.</p>
                    
                    <div className="bg-black/40 rounded-full h-4 w-full max-w-md mx-auto overflow-hidden relative mb-2">
                       <div className="absolute top-0 left-0 h-full w-[25%] bg-gradient-to-r from-chido-green to-emerald-400"></div>
                    </div>
                    <div className="flex justify-between max-w-md mx-auto text-[10px] font-bold text-zinc-500 uppercase">
                       <span>0 XP</span>
                       <span>Próximo Nivel: 500 XP</span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-12 text-left">
                       <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                          <div className="text-chido-green font-black text-xl mb-1">1%</div>
                          <div className="text-xs text-zinc-400">Rakeback Actual</div>
                       </div>
                       <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                          <div className="text-white font-black text-xl mb-1">$0</div>
                          <div className="text-xs text-zinc-400">Bono Nivel</div>
                       </div>
                       <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                          <div className="text-white font-black text-xl mb-1">NO</div>
                          <div className="text-xs text-zinc-400">Asesor VIP</div>
                       </div>
                    </div>
                 </div>
              )}

           </div>
        </div>
      </div>
    </MainLayout>
  );
}
