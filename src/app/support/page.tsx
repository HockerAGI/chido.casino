"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  HelpCircle, MessageCircle, Mail, FileText, 
  ShieldAlert, Smartphone, ChevronRight, Search 
} from "lucide-react";
import Link from "next/link";

export default function SupportPage() {
  return (
    <div className="min-h-screen pb-20">
      
      {/* HERO SECTION */}
      <div className="relative bg-[#121214] border-b border-white/5 py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00F0FF]/10 text-[#00F0FF] text-xs font-bold uppercase tracking-widest mb-6 border border-[#00F0FF]/20">
            <HelpCircle size={12} /> Centro de Ayuda
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">
            ¿En qué podemos <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00F0FF] to-[#0099FF]">ayudarte?</span>
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto mb-8">
            Encuentra respuestas rápidas o contacta directamente con nuestro equipo de soporte especializado 24/7.
          </p>
          
          {/* Barra de Búsqueda (Visual) */}
          <div className="relative max-w-lg mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Buscar un problema (ej. Depósitos, KYC...)" 
              className="w-full h-14 bg-black/50 border border-white/10 rounded-full pl-12 pr-4 text-white focus:outline-none focus:border-[#00F0FF] transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12 grid gap-12">

        {/* CANALES DE CONTACTO (Priority) */}
        <section>
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <MessageCircle className="text-[#00F0FF]" size={20} /> Contacto Directo
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* WhatsApp Card */}
            <a 
              href="https://wa.me/526642368701" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1A1A1D] to-[#121214] border border-white/5 p-8 transition-all hover:border-[#25D366]/50 hover:shadow-[0_0_30px_rgba(37,211,102,0.1)]"
            >
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <MessageCircle size={100} />
              </div>
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-[#25D366]/20 text-[#25D366] flex items-center justify-center mb-4 border border-[#25D366]/20">
                  <MessageCircle size={24} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">WhatsApp VIP</h3>
                <p className="text-zinc-400 mb-6 text-sm">
                  Atención prioritaria para depósitos y dudas rápidas. Tiempo promedio de respuesta: 2 min.
                </p>
                <div className="flex items-center gap-2 text-[#25D366] font-bold text-sm uppercase tracking-wider group-hover:translate-x-2 transition-transform">
                  Iniciar Chat <ChevronRight size={16} />
                </div>
              </div>
            </a>

            {/* Email Card */}
            <a 
              href="mailto:soporte@chido.casino"
              className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1A1A1D] to-[#121214] border border-white/5 p-8 transition-all hover:border-[#00F0FF]/50 hover:shadow-[0_0_30px_rgba(0,240,255,0.1)]"
            >
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <Mail size={100} />
              </div>
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-[#00F0FF]/20 text-[#00F0FF] flex items-center justify-center mb-4 border border-[#00F0FF]/20">
                  <Mail size={24} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Correo Electrónico</h3>
                <p className="text-zinc-400 mb-6 text-sm">
                  Para temas legales, validación KYC o aclaraciones complejas. Respuesta en menos de 24 hrs.
                </p>
                <div className="flex items-center gap-2 text-[#00F0FF] font-bold text-sm uppercase tracking-wider group-hover:translate-x-2 transition-transform">
                  Enviar Correo <ChevronRight size={16} />
                </div>
              </div>
            </a>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section>
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <FileText className="text-[#FF0099]" size={20} /> Preguntas Frecuentes
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-6 bg-[#1A1A1D] border-white/5 hover:border-white/10 transition-colors">
              <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                <Smartphone size={16} className="text-zinc-500" /> Problemas de Navegación
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Nuestra plataforma está optimizada para la última versión de Chrome y Safari. Si experimentas problemas, intenta limpiar la caché o usar modo incógnito.
              </p>
            </Card>

            <Card className="p-6 bg-[#1A1A1D] border-white/5 hover:border-white/10 transition-colors">
              <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                <ShieldAlert size={16} className="text-zinc-500" /> Verificación (KYC)
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Por seguridad internacional, los retiros mayores requieren verificar tu identidad. Sube tu INE/Pasaporte en la sección de Perfil. Es un proceso único y encriptado.
              </p>
            </Card>

            <Card className="p-6 bg-[#1A1A1D] border-white/5 hover:border-white/10 transition-colors">
              <h3 className="font-bold text-white mb-2">Depósitos y Retiros</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Los depósitos SPEI son automáticos 24/7. Los retiros se procesan el mismo día si la cuenta está verificada. Revisa que la CLABE esté a tu nombre.
              </p>
            </Card>

            <Card className="p-6 bg-[#1A1A1D] border-white/5 hover:border-white/10 transition-colors">
              <h3 className="font-bold text-white mb-2">Juego Justo</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Todos nuestros juegos "Originals" (Crash, Plinko) utilizan tecnología Provably Fair verificable en blockchain. Nadie puede manipular el resultado.
              </p>
            </Card>
          </div>
        </section>

        {/* QUEJAS / DISPUTAS */}
        <section className="bg-white/5 rounded-3xl p-8 border border-white/5">
           <h2 className="text-lg font-bold text-white mb-4">Resolución de Disputas</h2>
           <p className="text-sm text-zinc-400 mb-6">
             Si tienes una reclamación formal sobre una jugada o transacción, sigue este protocolo para agilizar tu caso:
           </p>
           <ol className="list-decimal list-inside space-y-3 text-sm text-zinc-300">
             <li>Ten a la mano el <strong className="text-white">ID de la Transacción</strong> o el <strong className="text-white">ID de la Ronda</strong> (visible en tu historial).</li>
             <li>Envía un correo a <span className="text-[#00F0FF]">soporte@chido.casino</span> con el asunto "Disputa: [Tu Usuario]".</li>
             <li>Adjunta capturas de pantalla si es posible.</li>
             <li>Nuestro equipo de cumplimiento revisará los logs del servidor y responderá en un plazo máximo de 72 horas hábiles.</li>
           </ol>
        </section>

      </div>
    </div>
  );
}
