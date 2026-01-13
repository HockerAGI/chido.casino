import { Logo } from "@/components/ui/logo";
import { ShieldCheck, Zap, Users } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-white/10 pt-16 pb-8 bg-[#08080a] mt-auto">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12 mb-12">
        <div className="space-y-4">
          <Logo variant="iso-bw" size={50} showText={true} />
          <p className="text-zinc-500 text-sm leading-relaxed">
            El primer casino operado por Conciencia Digital. <br/>
            Seguridad Vertx. Finanzas Numia. <br/>
            Hecho en México 🇲🇽.
          </p>
        </div>
        
        <div>
          <h4 className="font-bold text-white mb-4 uppercase tracking-wider text-xs">Plataforma</h4>
          <ul className="space-y-2 text-sm text-zinc-400">
            <li className="hover:text-chido-cyan cursor-pointer">Juegos Crash</li>
            <li className="hover:text-chido-cyan cursor-pointer">Slots Exclusivos</li>
            <li className="hover:text-chido-cyan cursor-pointer">Niveles VIP</li>
            <li className="hover:text-chido-cyan cursor-pointer">Torneos</li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-white mb-4 uppercase tracking-wider text-xs">Legal & Ayuda</h4>
          <ul className="space-y-2 text-sm text-zinc-400">
            <li className="hover:text-chido-cyan cursor-pointer">Términos y Condiciones</li>
            <li className="hover:text-chido-cyan cursor-pointer">Política de Privacidad</li>
            <li className="hover:text-chido-cyan cursor-pointer">Juego Responsable</li>
            <li className="hover:text-chido-cyan cursor-pointer">Soporte NOVA</li>
          </ul>
        </div>

        <div className="space-y-4">
           <div className="flex items-center gap-2 text-zinc-500 text-xs">
              <ShieldCheck size={16} /> Licencia Operativa Vigente
           </div>
           <div className="flex items-center gap-2 text-zinc-500 text-xs">
              <Zap size={16} /> Certificado RNG Hocker
           </div>
           <div className="flex items-center gap-2 text-zinc-500 text-xs">
              <Users size={16} /> Solo Mayores de 18+
           </div>
        </div>
      </div>
      
      <div className="text-center pt-8 border-t border-white/5 text-zinc-600 text-xs">
         © 2026 Chido Casino. Hocker AGI Technologies. Todos los derechos reservados.
      </div>
    </footer>
  );
}
