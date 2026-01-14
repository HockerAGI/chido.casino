"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { Footer } from "@/components/layout/footer";
import { useWalletBalance } from "@/lib/useWalletBalance"; //
import { User, Award, ShieldCheck, AlertCircle, Camera, UploadCloud, Save } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

// Configuración de Niveles
const VIP_LEVELS = {
  1: { name: "Salsa Verde", img: "/badge-verde.png", minXp: 0, nextXp: 1000, color: "text-chido-green" }, // Usa la imagen nueva
  2: { name: "Serrano", img: "/badge-serrano.png", minXp: 1000, nextXp: 5000, color: "text-yellow-400" },
  3: { name: "Jalapeño", img: "/badge-jalapeno.png", minXp: 5000, nextXp: 20000, color: "text-orange-500" },
  4: { name: "Habanero", img: "/badge-habanero.png", minXp: 20000, nextXp: 100000, color: "text-red-600" }, // Tu imagen actual
};

export default function ProfilePage() {
  const { formatted } = useWalletBalance();
  const [activeTab, setActiveTab] = useState("general");
  const [isEditing, setIsEditing] = useState(false);
  const [currentLevel] = useState(4); // Cambia esto para probar niveles (1-4)
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    phone: "",
    name: "",
    gender: "male" // Default
  });

  const levelData = VIP_LEVELS[currentLevel as keyof typeof VIP_LEVELS];

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto animate-fade-in px-4 pb-20">
        
        {/* HEADER PERFIL */}
        <div className="relative rounded-3xl overflow-hidden bg-zinc-900 border border-white/5 mb-8 shadow-2xl">
           <div className="h-32 bg-gradient-to-r from-chido-cyan/20 via-chido-pink/20 to-black/50" />
           <div className="px-8 pb-8 flex flex-col md:flex-row items-end -mt-12 gap-6">
              <div className="w-32 h-32 rounded-full border-4 border-[#050510] bg-zinc-800 p-1 relative group shadow-lg">
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
                 <p className="text-zinc-400 text-xs mt-1">ID de Jugador: 839210</p>
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
           {/* SIDEBAR TABS */}
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

           {/* CONTENIDO DINÁMICO */}
           <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-8 min-h-[400px] relative overflow-hidden">
              <div className="absolute top-0 right-0 p-32 bg-chido-cyan/5 blur-3xl rounded-full -z-10"/>

              {activeTab === 'general' && (
                  <div className="space-y-6 animate-fade-in">
                    <h2 className="text-2xl font-black mb-6 text-white">Información Personal</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Correo Electrónico</label>
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
                            className={`w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm focus:border-chido-cyan outline-none transition-all ${isEditing ? 'focus:ring-2 ring-chido-cyan/20' : ''}`} 
                          />
                       </div>

                       <div className="space-y-2">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Nombre Completo</label>
                          <input 
                            type="text" 
                            placeholder="Tu nombre real" 
                            disabled={!isEditing} 
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            className={`w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm focus:border-chido-cyan outline-none transition-all`} 
                          />
                       </div>

                       <div className="space-y-2">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Género (Para Avatar)</label>
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
                    <div className="flex items-center justify-between p-5 bg-chido-red/10 border border-chido-red/20 rounded-2xl">
                       <div className="flex items-center gap-4">
                          <div className="p-3 bg-chido-red/20 rounded-full">
                            <AlertCircle className="text-chido-red" size={24} />
                          </div>
                          <div>
                             <div className="font-bold text-chido-red text-base">Verificación Requerida</div>
                             <div className="text-xs text-chido-red/70 mt-1">Sube tu INE/Pasaporte para retirar tus ganancias.</div>
                          </div>
                       </div>
                    </div>

                    <div className="border-2 border-dashed border-white/10 rounded-3xl p-10 flex flex-col items-center justify-center text-center hover:bg-white/5 hover:border-chido-cyan/30 transition-all cursor-pointer group">
                        <UploadCloud size={48} className="text-zinc-600 group-hover:text-chido-cyan transition-colors mb-4" />
                        <h3 className="font-bold text-white text-lg mb-2">Arrastra tu ID aquí</h3>
                        <p className="text-xs text-zinc-500 max-w-xs mx-auto">Soportamos JPG, PNG o PDF. Asegúrate que el texto sea legible.</p>
                        <button className="mt-6 px-6 py-2 bg-white text-black text-xs font-bold rounded-full">Seleccionar Archivo</button>
                    </div>
                  </div>
              )}

              {activeTab === 'vip' && (
                  <div className="flex flex-col items-center py-4 animate-fade-in">
                    {/* Badge Dinámico */}
                    <div className="relative w-48 h-48 mb-6 drop-shadow-[0_0_35px_rgba(255,215,0,0.2)] animate-float">
                       <Image 
                         src={levelData.img} 
                         alt={levelData.name} 
                         fill 
                         className="object-contain"
                         priority
                       /> 
                    </div>
                    
                    <h2 className="text-4xl font-black text-white mb-2 italic uppercase tracking-tighter">{levelData.name}</h2>
                    <p className={`font-bold text-sm mb-8 uppercase tracking-widest ${levelData.color}`}>Nivel Actual</p>
                    
                    <div className="w-full max-w-md space-y-2">
                        <div className="flex justify-between text-xs font-bold text-zinc-400">
                            <span>XP Actual: 250</span>
                            <span>Siguiente: {levelData.nextXp}</span>
                        </div>
                        <div className="bg-black/60 rounded-full h-4 w-full overflow-hidden border border-white/10 relative">
                           <div className={`absolute top-0 left-0 h-full w-[25%] bg-gradient-to-r ${currentLevel === 4 ? 'from-chido-red to-orange-500' : 'from-chido-green to-chido-cyan'} shadow-[0_0_15px_currentColor]`}></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 w-full max-w-lg mt-10">
                        <div className="p-5 bg-zinc-800/50 rounded-2xl border border-white/5 flex flex-col items-center hover:border-white/20 transition-colors">
                            <span className="text-3xl font-black text-white mb-1">1%</span>
                            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Rakeback</span>
                        </div>
                        <div className="p-5 bg-zinc-800/50 rounded-2xl border border-white/5 flex flex-col items-center hover:border-white/20 transition-colors">
                            <span className="text-3xl font-black text-white mb-1">24/7</span>
                            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Soporte VIP</span>
                        </div>
                    </div>
                  </div>
              )}
           </div>
        </div>
      </div>
      <div className="mt-20"><Footer /></div>
    </MainLayout>
  );
}
