"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { Footer } from "@/components/layout/footer";
import { useWalletBalance } from "@/lib/useWalletBalance";
import { User, Award, ShieldCheck, AlertCircle, Camera, UploadCloud, Save } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

// Configuración de Niveles (Asegúrate de generar estas imágenes)
const VIP_LEVELS = {
  1: { name: "Salsa Verde", img: "/badge-verde.png", minXp: 0, nextXp: 1000, color: "text-chido-green" },
  2: { name: "Serrano", img: "/badge-serrano.png", minXp: 1000, nextXp: 5000, color: "text-yellow-400" },
  3: { name: "Jalapeño", img: "/badge-jalapeno.png", minXp: 5000, nextXp: 20000, color: "text-orange-500" },
  4: { name: "Habanero", img: "/badge-habanero.png", minXp: 20000, nextXp: 100000, color: "text-red-600" },
};

export default function ProfilePage() {
  const { formatted } = useWalletBalance();
  const [activeTab, setActiveTab] = useState("general");
  const [isEditing, setIsEditing] = useState(false);
  const [currentLevel] = useState(4); // Simulación de nivel
  
  const [formData, setFormData] = useState({
    phone: "",
    name: "",
    gender: "male"
  });

  const levelData = VIP_LEVELS[currentLevel as keyof typeof VIP_LEVELS];

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto animate-fade-in px-4 pb-20">
        
        {/* Header Perfil */}
        <div className="relative rounded-3xl overflow-hidden bg-zinc-900 border border-white/5 mb-8 shadow-2xl">
           <div className="h-32 bg-gradient-to-r from-chido-cyan/20 via-chido-pink/20 to-black/50" />
           <div className="px-8 pb-8 flex flex-col md:flex-row items-end -mt-12 gap-6">
              <div className="w-32 h-32 rounded-full border-4 border-[#050510] bg-zinc-800 p-1 relative group shadow-lg">
                 {/* Avatar Dinámico por Género */}
                 <img 
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${formatted}&gender=${formData.gender}`} 
                    className="w-full h-full rounded-full bg-black/20" 
                    alt="Avatar"
                 />
                 <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer backdrop-blur-sm">
                    <Camera size={24} className="text-white"/>
                 </div>
              </div>
              <div className="flex-1 mb-2">
                 <h1 className="text-3xl font-black text-white flex flex-col md:flex-row md:items-center gap-2">
                   Usuario Chido 
                   <span className={`text-xs px-3 py-1 rounded-full uppercase border bg-black/50 ${levelData.color} border-current w-fit`}>
                     VIP: {levelData.name}
                   </span>
                 </h1>
                 <p className="text-zinc-400 text-xs mt-1">ID: 839210</p>
              </div>
              <button 
                onClick={() => setIsEditing(!isEditing)} 
                className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${isEditing ? 'bg-chido-green text-black hover:scale-105' : 'bg-white/10 hover:bg-white/20'}`}
              >
                  {isEditing ? <><Save size={14}/> Guardar</> : "Editar Perfil"}
              </button>
           </div>
        </div>

        <div className="grid md:grid-cols-[250px_1fr] gap-8">
           <div className="space-y-2">
              {[
                { id: 'general', label: 'General', icon: User },
                { id: 'verification', label: 'Verificación', icon: ShieldCheck },
                { id: 'vip', label: 'Nivel VIP', icon: Award }
              ].map((tab) => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)} 
                  className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl text-sm font-bold transition-all border ${activeTab === tab.id ? 'bg-white text-black border-white shadow-lg scale-105' : 'bg-zinc-900/50 text-zinc-400 border-transparent hover:bg-white/5'}`}
                >
                  <tab.icon size={18}/> {tab.label}
                </button>
              ))}
           </div>

           <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-8 min-h-[400px] relative overflow-hidden">
              <div className="absolute top-0 right-0 p-32 bg-chido-cyan/5 blur-3xl rounded-full -z-10"/>

              {activeTab === 'general' && (
                  <div className="space-y-6 animate-fade-in">
                    <h2 className="text-2xl font-black mb-6 text-white">Información Personal</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Correo</label>
                          <input type="text" value="usuario@chido.casino" disabled className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3.5 text-zinc-500 text-sm cursor-not-allowed" />
                       </div>
                       
                       <div className="space-y-2">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Teléfono</label>
                          <input 
                            type="text" 
                            placeholder="+52 ..." 
                            disabled={!isEditing} 
                            value={formData.phone}
                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                            className={`w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm focus:border-chido-cyan outline-none transition-all`} 
                          />
                       </div>

                       <div className="space-y-2">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Nombre</label>
                          <input 
                            type="text" 
                            placeholder="Tu nombre real" 
                            disabled={!isEditing} 
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            className={`w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm focus:border-chido-cyan outline-none transition-all`} 
                          />
                       </div>

                       {/* SELECTOR DE GÉNERO AGREGADO */}
                       <div className="space-y-2">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Género (Avatar)</label>
                          <select 
                            disabled={!isEditing}
                            value={formData.gender}
                            onChange={(e) => setFormData({...formData, gender: e.target.value})}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm focus:border-chido-cyan outline-none appearance-none"
                          >
                            <option value="male">Hombre</option>
                            <option value="female">Mujer</option>
                          </select>
                       </div>
                    </div>
                  </div>
              )}

              {activeTab === 'verification' && (
                  <div className="space-y-6 animate-fade-in">
                     {/* ... Contenido de verificación (igual al anterior) ... */}
                     <div className="border-2 border-dashed border-white/10 rounded-3xl p-10 flex flex-col items-center justify-center text-center">
                        <UploadCloud size={48} className="text-zinc-600 mb-4" />
                        <h3 className="font-bold text-white text-lg">Subir Documentos</h3>
                        <p className="text-xs text-zinc-500">INE / Pasaporte</p>
                     </div>
                  </div>
              )}

              {activeTab === 'vip' && (
                  <div className="flex flex-col items-center py-4 animate-fade-in">
                    <div className="relative w-48 h-48 mb-6 drop-shadow-[0_0_35px_rgba(255,215,0,0.2)] animate-float">
                       {/* Imagen dinámica según nivel */}
                       <Image src={levelData.img} alt={levelData.name} fill className="object-contain" priority /> 
                    </div>
                    <h2 className="text-4xl font-black text-white mb-2 italic uppercase tracking-tighter">{levelData.name}</h2>
                    <p className={`font-bold text-sm mb-8 uppercase tracking-widest ${levelData.color}`}>Nivel Actual</p>
                  </div>
              )}
           </div>
        </div>
      </div>
      <div className="mt-20"><Footer /></div>
    </MainLayout>
  );
}