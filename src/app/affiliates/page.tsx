"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Link as LinkIcon, Copy, TrendingUp, Coins, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useWalletBalance } from "@/lib/useWalletBalance";

export default function AffiliatesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { balance } = useWalletBalance();

  // TODO: cuando conectes afiliados reales, reemplaza esto por el código del usuario.
  const affiliateCode = "CHIDO-VIP-99";
  const link = `https://chido.casino/r/${affiliateCode}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast({
        title: "Link copiado",
        description: "Compártelo en tus redes y empieza a generar comisiones.",
      });
    } catch {
      toast({
        title: "No se pudo copiar",
        description: "Copia manualmente el link.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen pb-20 animate-fade-in">
      <div className="bg-[#121214] border-b border-white/5 pt-10 pb-16 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-2">
              Panel de <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#32CD32] to-[#00F0FF]">Afiliados</span>
            </h1>
            <p className="text-zinc-400 text-sm md:text-base font-medium">
              Comparte tu link. Cada registro válido que juegue te genera comisión.
            </p>
          </div>

          <Button
            onClick={() => router.push("/wallet?tab=withdraw")}
            className="bg-[#32CD32] text-black hover:bg-[#28a745] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(50,205,50,0.3)]"
          >
            Retirar comisiones
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-8 relative z-10 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-[#1A1A1D] border-white/5 p-5 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Clicks</div>
              <div className="p-1.5 bg-white/5 rounded-lg text-zinc-400"><TrendingUp size={16} /></div>
            </div>
            <div className="text-3xl font-black text-white">0</div>
          </Card>

          <Card className="bg-[#1A1A1D] border-white/5 p-5 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Registros</div>
              <div className="p-1.5 bg-white/5 rounded-lg text-zinc-400"><Users size={16} /></div>
            </div>
            <div className="text-3xl font-black text-white">0</div>
          </Card>

          <Card className="bg-[#1A1A1D] border-white/5 p-5 rounded-2xl shadow-xl md:col-span-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#32CD32]/10 blur-3xl rounded-full pointer-events-none" />
            <div className="flex items-center justify-between mb-2 relative z-10">
              <div className="text-[10px] font-bold text-[#32CD32] uppercase tracking-widest">Comisiones generadas</div>
              <div className="p-1.5 bg-[#32CD32]/10 rounded-lg text-[#32CD32]"><Coins size={16} /></div>
            </div>
            <div className="text-3xl font-black text-[#00F0FF] relative z-10 drop-shadow-md">
              {balance.toFixed(2)} <span className="text-lg text-white/50">MXN</span>
            </div>
          </Card>
        </div>

        <Card className="bg-[#1A1A1D] border-white/5 p-6 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-xs text-zinc-500 uppercase font-bold tracking-widest mb-1">Tu link</div>
              <div className="flex items-center gap-2">
                <LinkIcon size={16} className="text-[#00F0FF]" />
                <div className="font-mono text-sm text-white/90 break-all">{link}</div>
              </div>
            </div>

            <Button onClick={copyToClipboard} className="bg-white text-black hover:bg-zinc-200 font-black">
              <Copy size={16} className="mr-2" /> Copiar
            </Button>
          </div>

          <div className="mt-4 flex items-start gap-2 text-xs text-white/60">
            <ShieldAlert size={16} className="mt-0.5" />
            Evita auto-referidos y cuentas múltiples. Si detectamos abuso, se bloquean comisiones.
          </div>
        </Card>
      </div>
    </div>
  );
}