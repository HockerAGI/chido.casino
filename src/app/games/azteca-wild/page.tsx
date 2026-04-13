"use client";

import ReleaseGamePage from "@/components/games/ReleaseGamePage";
import { ShieldCheck, Flame, Sparkles } from "lucide-react";

export default function AztecaWildPage() {
  return (
    <ReleaseGamePage
      badge="SLOT PREMIUM"
      badgeTone="emerald"
      emoji="🏛️"
      title="Azteca Wild"
      subtitle="Piedra, fuego y cascadas con pulso de marca grande."
      description="Pirámides, wilds en cascada, bonus rounds con energía ceremonial y una estética que se siente de estudio premium. La sala queda lista para la integración real de motor, audio y provider."
      stats={[
        { label: "RTP", value: "96.8%" },
        { label: "Max Win", value: "5,000x" },
        { label: "Volatilidad", value: "Alta" },
      ]}
      features={[
        { title: "Wilds encadenados", copy: "Caídas con reacciones visuales y feedback que empuja la emoción.", icon: Sparkles },
        { title: "Bonus ceremonial", copy: "Pantalla, ritmo y FX para que el bonus se sienta como evento.", icon: Flame },
        { title: "Backoffice listo", copy: "Pensado para colgarse al control maestro de HOCKER sin fricción.", icon: ShieldCheck },
      ]}
      progress={[
        { label: "Arte y UI", value: 100 },
        { label: "Motion FX", value: 100 },
        { label: "Motor provider", value: 62 },
      ]}
      note="Sala visual lista para release oficial."
      actions={[
        { label: "Preparar saldo", href: "/wallet?tab=deposit" },
        { label: "Ver Lobby", href: "/lobby", variant: "secondary" },
      ]}
    />
  );
}