"use client";

import { useState } from "react";
import { Users, Link as LinkIcon, Copy, TrendingUp, CheckCircle2, AlertTriangle, Coins } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useWalletBalance } from "@/lib/useWalletBalance";

export default function AffiliatesPage() {
  const { toast } = useToast();
  const { balance } = useWalletBalance(); // Para UX realista
  
  // Dummy data para UI inicial (Luego lo conectas al endpoint)
  const affiliateCode = "CHIDO-VIP-99"; 
  const link = `https://chido.casino/r/${affiliateCode}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(link);
    toast({
      title: "¡Link Copiado!",
      description: "Pégalo en tus redes y empieza a armar tu clica.",
      className: "bg-[#32CD32] text-black border-none font-bold",
    });
  };

  return (
    <div className="min-h-screen pb-20 animate-fade-in">
      
      {/* HERO DASHBOARD */}
      <div className="bg-[#121214] border-b border-white/5 pt-10 pb-16 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
           <div>
             <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-2">
               Panel de <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#32CD32] to-[#00F0FF]">Socios</span>
             </h1>
             <p className="text-zinc-400 text-sm md:text-base font-medium">
               Trae a tu banda, gana una comisión en caliente. Todo transparente y directo a tu saldo.
             </p>
           </div>
           
           <Button className="bg-[#32CD32] text-black hover:bg-[#28a745] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(50,205,50,0.3)]">
             Retirar Comisiones
           </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-8 relative z-10 space-y-8">
        
        {/* STATS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-[#1A1A1D] border-white/5 p-5 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between mb-2">
               <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Clicks</div>
               <div className="p-1.5 bg-white/5 rounded-lg text-zinc-400"><TrendingUp size={16}/></div>
            </div>
            <div className="text-3xl font-black text-white">0</div>
          </Card>
          
          <Card className="bg-[#1A1A1D] border-white/5 p-5 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between mb-2">
               <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Registros</div>
               <div className="p-1.5 bg-white/5 rounded-lg text-zinc-400"><Users size={16}/></div>
            </div>
            <div className="text-3xl font-black text-white">0</div>
          </Card>

          <Card className="bg-[#1A1A1D] border-white/5 p-5 rounded-2xl shadow-xl md:col-span-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#32CD32]/10 blur-3xl rounded-full pointer-events-none" />
            <div className="flex items-center justify-between mb-2 relative z-10">
               <div className="text-[10px] font-bold text-[#32CD32] uppercase tracking-widest">Comisiones Generadas</div>
               <div className="p-1.5 bg-[#32CD32]/10 rounded-lg text-[#32CD32]"><Coins size={16}/></div>
            </div>
            <div className="text-3xl font-black text-[#00F0FF] relative z-10 drop-shadow-md">
              $0.00 <span className="text-lg text-white/50">MXN</span>
            </div>
          </Card>
        </div>

        {/* LINK SECTION & TIPS */}
        <div className="grid md:grid-cols-2 gap-8">
           
           {/* Generador de Link */}
           <Card className="bg-[#121214] border-white/5 p-8 rounded-3xl">
             <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#00F0FF]/10 flex items-center justify-center text-[#00F0FF]">
                  <LinkIcon size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">Tu Enlace Personal</h2>
                  <p className="text-xs text-zinc-500">Compártelo y gana el 20% del house edge.</p>
                </div>
             </div>

             <div className="flex items-center bg-black border border-white/10 rounded-2xl p-2 mb-6 focus-within:border-[#00F0FF]/50 transition-colors">
                <input 
                  type="text" 
                  readOnly 
                  value={link} 
                  className="bg-transparent w-full text-zinc-300 text-sm px-4 outline-none font-mono"
                />
                <Button 
                  onClick={copyToClipboard}
                  className="bg-[#00F0FF] text-black hover:bg-[#00d6e6] rounded-xl font-bold flex items-center gap-2"
                >
                  <Copy size={16} /> Copiar
                </Button>
             </div>

             <div className="bg-[#FF0099]/10 border border-[#FF0099]/20 rounded-xl p-4 flex items-start gap-3">
               <CheckCircle2 className="text-[#FF0099] flex-shrink-0 mt-0.5" size={18} />
               <div className="text-sm text-white/80">
                 <strong className="text-white block mb-1">Bono de Bienvenida Activado</strong>
                 Tus referidos reciben un bono automático al depositar usando este link. Pura ventaja para ellos.
               </div>
             </div>
           </Card>

           {/* Tips / Reglas */}
           <Card className="bg-[#1A1A1D] border-white/5 p-8 rounded-3xl">
             <h2 className="text-xl font-black text-white mb-6">Tips pa' que jale chido</h2>
             
             <ul className="space-y-6">
                <li className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 font-black text-sm flex-shrink-0">1</div>
                  <div>
                    <h3 className="font-bold text-white text-sm mb-1">Cero Spam de bots</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">Pásalo en tus grupos de WhatsApp, Telegram o streams. La banda confía más si se los explicas tú.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 font-black text-sm flex-shrink-0">2</div>
                  <div>
                    <h3 className="font-bold text-white text-sm mb-1">Destaca el retiro rápido</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">Diles la verdad: aquí los retiros caen en fa por SPEI, no andamos con cuentos.</p>
                  </div>
                </li>
             </ul>

             <div className="mt-8 pt-6 border-t border-white/5 flex items-start gap-3">
                <AlertTriangle className="text-yellow-500 flex-shrink-0" size={16} />
                <p className="text-[11px] text-zinc-500 leading-tight">
                  Autoreferirse o usar cuentas múltiples para abusar de las comisiones resultará en baneo permanente de la cuenta y congelación de fondos. ¡Juega limpio!
                </p>
             </div>
           </Card>

        </div>
      </div>
    </div>
  );
}
