import { Logo } from "@/components/ui/logo";
import { ShieldCheck, Zap, Instagram, Twitter, Facebook } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/5 pt-20 pb-32 lg:pb-8 bg-[#030305] mt-auto relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-chido-cyan via-chido-pink to-chido-gold opacity-30" />
      
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12 mb-16 relative z-10">
        <div className="space-y-6">
          <Link href="/lobby">
             {/* Logo más grande */}
             <Logo variant="iso-bw" size={80} showText={true} />
          </Link>
          <p className="text-zinc-500 text-sm leading-relaxed max-w-xs">
            La experiencia de casino definitiva. Pagos rápidos, juegos justos y la comunidad más chida de Latinoamérica.
          </p>
          <div className="flex gap-4">
             {[Twitter, Instagram, Facebook].map((Icon, i) => (
                 <div key={i} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:bg-chido-cyan hover:text-black transition-all cursor-pointer">
                     <Icon size={18} />
                 </div>
             ))}
          </div>
        </div>
        
        <div>
          <h4 className="font-black text-white mb-6 uppercase tracking-widest text-xs">Juegos</h4>
          <ul className="space-y-3 text-sm text-zinc-400 font-medium">
            <li className="hover:text-chido-pink cursor-pointer transition-colors flex items-center gap-2"><Zap size={12}/> Crash Original</li>
            <li className="hover:text-chido-pink cursor-pointer transition-colors">Slots Habanero</li>
            <li className="hover:text-chido-pink cursor-pointer transition-colors">Ruleta en Vivo</li>
          </ul>
        </div>

        <div>
          <h4 className="font-black text-white mb-6 uppercase tracking-widest text-xs">Soporte</h4>
          <ul className="space-y-3 text-sm text-zinc-400 font-medium">
            <li className="hover:text-chido-cyan cursor-pointer transition-colors">Centro de Ayuda</li>
            <li className="hover:text-chido-cyan cursor-pointer transition-colors">Juego Responsable</li>
            <li className="hover:text-chido-cyan cursor-pointer transition-colors">Contacto 24/7</li>
          </ul>
        </div>

        <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 text-center">
           <div className="w-12 h-12 bg-chido-green/20 text-chido-green rounded-xl flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={24} />
           </div>
           <div className="text-xs font-bold text-zinc-300 mb-1">Licencia Operativa</div>
           <div className="text-[10px] text-zinc-600">Regulado por Curacao Gaming Authority bajo licencia GLH-OCCHKTW07022026.</div>
        </div>
      </div>
      
      <div className="text-center pt-8 border-t border-white/5 text-zinc-700 text-xs font-bold uppercase tracking-widest">
         © 2026 Hocker AGI Technologies inc.
      </div>
    </footer>
  );
}