import { Logo } from "@/components/ui/logo";
import { ShieldCheck, Instagram, Twitter, Facebook, AlertTriangle } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/5 pt-16 pb-32 lg:pb-10 bg-[#020203] mt-auto relative overflow-hidden">
      
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12 mb-16 relative z-10">
        
        {/* Marca & Licencia */}
        <div className="space-y-6 md:col-span-1">
          <Link href="/lobby" className="block w-fit opacity-90 hover:opacity-100 transition-opacity">
             <Logo variant="iso-bw" size={60} />
          </Link>
          <div className="text-zinc-500 text-xs leading-relaxed space-y-2">
            <p><strong>Licencia 8048/JAZ</strong> emitida a Antillephone, autorizada y regulada por el Gobierno de Curazao.</p>
            <p>Hocker AGI Technologies opera este sitio web bajo las leyes aplicables.</p>
          </div>
        </div>
        
        {/* Navegación */}
        <div>
          <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-[10px]">Plataforma</h4>
          <ul className="space-y-3 text-xs text-zinc-500 font-medium">
            <li className="hover:text-white cursor-pointer transition-colors">Juegos VIP</li>
            <li className="hover:text-white cursor-pointer transition-colors">Torneos</li>
            <li className="hover:text-white cursor-pointer transition-colors">Promociones</li>
            <li className="hover:text-white cursor-pointer transition-colors">Programa de Lealtad</li>
          </ul>
        </div>

        {/* Legal (Requerido por Compliance) */}
        <div>
          <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-[10px]">Legal & Compliance</h4>
          <ul className="space-y-3 text-xs text-zinc-500 font-medium">
            <li className="hover:text-white cursor-pointer transition-colors">Términos y Condiciones</li>
            <li className="hover:text-white cursor-pointer transition-colors">Política de Privacidad</li>
            <li className="hover:text-white cursor-pointer transition-colors">Política AML / KYC</li>
            <li className="hover:text-white cursor-pointer transition-colors">Autoexclusión</li>
            <li className="hover:text-white cursor-pointer transition-colors">Resolución de Disputas</li>
          </ul>
        </div>

        {/* Juego Responsable & Sellos */}
        <div className="flex flex-col gap-4">
           <div className="bg-zinc-900/50 p-4 rounded-xl border border-white/5 flex items-center gap-3">
              <div className="bg-red-500/10 p-2 rounded-full text-red-500 font-black text-xs border border-red-500/20">18+</div>
              <div className="text-[10px] text-zinc-500 leading-tight">
                 El juego puede ser adictivo. Juega responsablemente.
              </div>
           </div>
           
           <div className="flex gap-4 mt-2">
             {[Twitter, Instagram, Facebook].map((Icon, i) => (
                 <div key={i} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 hover:bg-white hover:text-black transition-all cursor-pointer">
                     <Icon size={14} />
                 </div>
             ))}
           </div>
        </div>
      </div>
      
      {/* Barra Final de Copyright y Métodos de Pago */}
      <div className="max-w-7xl mx-auto px-6 border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
         <div className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">
            © 2026 Chido Casino. Todos los derechos reservados.
         </div>
         <div className="flex items-center gap-2 opacity-40 grayscale">
            {/* Placeholders de logos de pago (texto por ahora) */}
            <span className="text-[10px] font-black">VISA</span>
            <span className="text-[10px] font-black">MASTERCARD</span>
            <span className="text-[10px] font-black">BITCOIN</span>
         </div>
      </div>
    </footer>
  );
}
