import { Logo } from "@/components/ui/logo";
import { Twitter, Instagram, Facebook } from "lucide-react"; // ShieldCheck removido si no se usa
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/5 pt-16 pb-32 lg:pb-10 bg-[#020203] mt-auto relative overflow-hidden">
      
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12 mb-12 relative z-10">
        
        {/* Marca & Licencia */}
        <div className="space-y-6 md:col-span-1">
          <Link href="/lobby" className="block w-fit opacity-90 hover:opacity-100 transition-opacity">
             <Logo variant="iso-bw" size={60} />
          </Link>
          <div className="text-zinc-500 text-xs leading-relaxed space-y-2">
            <p><strong>Licencia 8048/JAZ</strong> emitida a Antillephone, autorizada y regulada por el Gobierno de Curazao.</p>
            <p>Hocker AGI Technologies opera este sitio web.</p>
          </div>
        </div>
        
        {/* Navegación */}
        <div>
          <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-[10px]">Plataforma</h4>
          <ul className="space-y-3 text-xs text-zinc-500 font-medium">
            <li><Link href="/games/taco-slot" className="hover:text-white transition-colors">Taco Slot</Link></li>
            <li><Link href="/games/crash" className="hover:text-white transition-colors">Crash</Link></li>
            <li><Link href="/promos" className="hover:text-white transition-colors">Promociones</Link></li>
            <li><Link href="/affiliates" className="hover:text-white transition-colors">Afiliados</Link></li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-[10px]">Legal & Compliance</h4>
          <ul className="space-y-3 text-xs text-zinc-500 font-medium">
            {/* Todos apuntan a /legal por ahora, mejor que no hacer nada */}
            <li><Link href="/legal" className="hover:text-white transition-colors">Términos y Condiciones</Link></li>
            <li><Link href="/legal" className="hover:text-white transition-colors">Política de Privacidad</Link></li>
            <li><Link href="/legal" className="hover:text-white transition-colors">Juego Responsable</Link></li>
            <li><Link href="/support" className="hover:text-white transition-colors">Centro de Ayuda</Link></li>
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
             <Link href="https://twitter.com" target="_blank" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 hover:bg-white hover:text-black transition-all">
                 <Twitter size={14} />
             </Link>
             <Link href="https://instagram.com" target="_blank" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 hover:bg-white hover:text-black transition-all">
                 <Instagram size={14} />
             </Link>
             <Link href="https://facebook.com" target="_blank" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 hover:bg-white hover:text-black transition-all">
                 <Facebook size={14} />
             </Link>
           </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
         <div className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">
            © 2026 Chido Casino. Todos los derechos reservados.
         </div>
         <div className="flex items-center gap-2 opacity-40 grayscale">
            <span className="text-[10px] font-black">VISA</span>
            <span className="text-[10px] font-black">MASTERCARD</span>
            <span className="text-[10px] font-black">SPEI</span>
         </div>
      </div>
    </footer>
  );
}