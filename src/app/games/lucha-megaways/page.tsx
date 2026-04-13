"use client";

import ReleaseGamePage from "@/components/games/ReleaseGamePage";
import { Sparkles, ShieldCheck, Crown } from "lucide-react";

export default function LuchaMegawaysPage() {
  return (
    <ReleaseGamePage
      badge="MEGAWAYS"
      badgeTone="violet"
      emoji="🥊"
      title="Lucha Libre Megaways"
      subtitle="Enmascarados, multipliers y ritmo de ring premium."
      description="La energía de la lucha libre se traduce aquí en cascadas, hit feedback y un sistema visual que se siente de estudio grande. Queda con color, identidad y timing para reventar en mobile."
      stats={[
        { label: "RTP", value: "96.2%" },
        { label: "Max Win", value: "8,500x" },
        { label: "Modo", value: "Megaways" },
      ]}
      features={[
        { title: "Drama de ring", copy: "Cada giro tiene que tener presencia y tensión visual.", icon: Crown },
        { title: "Wilds explosivos", copy: "Capas de animación y FX para un look de proveedor top.", icon: Sparkles },
        { title: "Escalado listo", copy: "Frontend preparado para colgarse al backend de HOCKER.", icon: ShieldCheck },
      ]}
      progress={[
        { label: "Visual polish", value: 100 },
        { label: "Motion & VFX", value: 100 },
        { label: "Real engine", value: 60 },
      ]}
      note="Front listo para integración real."
      actions={[
        { label: "Preparar saldo", href: "/wallet?tab=deposit" },
        { label: "Ver otros juegos", href: "/lobby", variant: "secondary" },
      ]}
    />
  );
}