"use client";
import { MainLayout } from "@/components/layout/main-layout";
import { MessageCircle, Mail } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function SupportPage() {
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto p-6 animate-fade-in">
        <h1 className="text-3xl font-black text-white mb-6">Soporte CHIDO</h1>
        <p className="text-zinc-400 mb-8">
          ¿Problemas con un depósito? ¿Dudas con un juego? Estamos en línea 24/7.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          <a href="https://wa.me/526642368701" target="_blank" rel="noreferrer">
            <Card className="p-8 flex flex-col items-center text-center hover:bg-white/5 transition-colors cursor-pointer border-chido-green/30">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4 text-green-500">
                <MessageCircle size={32} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">WhatsApp Directo</h2>
              <p className="text-sm text-zinc-500">
                Respuesta promedio: 2 minutos.<br/>
                Para depósitos manuales y dudas rápidas.
              </p>
            </Card>
          </a>

          <Card className="p-8 flex flex-col items-center text-center border-white/10">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4 text-white">
              <Mail size={32} />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Correo Electrónico</h2>
            <p className="text-sm text-zinc-500">
              soporte@chido.casino<br/>
              Para temas legales o aclaraciones complejas.
            </p>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}