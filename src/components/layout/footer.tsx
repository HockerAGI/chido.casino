import { Logo } from "@/components/ui/logo";
import { ShieldCheck, Zap, Instagram, Twitter, Facebook } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/5 pt-16 pb-32 lg:pb-10 bg-[#020203] mt-auto relative overflow-hidden">
      
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12 mb-12 relative z-10">
        
        {/* COLUMNA 1: MARCA BW */}
        <div className="space-y-6">
          <Link href="/lobby" className="block w-fit opacity-80 hover:opacity-100 transition-opacity">
             {/* CORRECCIÓN AQUÍ: Sin showText */}
             <Logo variant="iso-bw" size={60} />
          </Link>
          <p className="text-zinc-600 text-xs leading-relaxed max-w-xs">
            Operado por Hocker AGI Technologies bajo licencia maestra de juego #5536/JAZ emitida por el Gobernador General de Curazao.
          </p>
          <div className="flex gap-4">
             {[Twitter, Instagram, Facebook].map((Icon, i) => (
                 <div key={i} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 hover:bg-white hover:text-black transition-all cursor-pointer">
                     <Icon size={16} />
                 </div>
             ))}
          </div>
        </div>
        
        {/* COLUMNA 2 */}
        <div>
          <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-[10px]">Casino</h4>
          <ul className="space-y-3 text-xs text-zinc-500 font-medium">
            <li className="hover:text-white cursor-pointer transition-colors">Juegos en Vivo</li>
            <li className="hover:text-white cursor-pointer transition-colors">Slots</li>
            <li className="hover:text-white cursor-pointer transition-colors">Originals</li>
            <li className="hover:text-white cursor-pointer transition-colors">VIP Club</li>
          </ul>
        </div>

        {/* COLUMNA 3 */}
        <div>
          <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-[10px]">Legal & Ayuda</h4>
          <ul className="space-y-3 text-xs text-zinc-500 font-medium">
            <li className="hover:text-white cursor-pointer transition-colors">Términos de Servicio</li>
            <li className="hover:text-white cursor-pointer transition-colors">Política de Privacidad</li>
            <li className="hover:text-white cursor-pointer transition-colors">Juego Responsable</li>
            <li className="hover:text-white cursor-pointer transition-colors">Autoexclusión</li>
          </ul>
        </div>

        {/* COLUMNA 4: Sello */}
        <div className="bg-zinc-900/30 p-6 rounded-2xl border border-white/5 text-center flex flex-col items-center justify-center">
           <ShieldCheck size={32} className="text-zinc-600 mb-3" />
           <div className="text-[10px] text-zinc-500 font-bold mb-1">Pagos Seguros</div>
           <div className="text-[9px] text-zinc-700 leading-tight">
             Todas las transacciones están encriptadas con tecnología SSL de 256-bits.
           </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
         <div className="text-zinc-700 text-[10px] font-bold uppercase tracking-widest">
            © 2026 Chido Casino. Todos los derechos reservados.
         </div>
      </div>
    </footer>
  );
}