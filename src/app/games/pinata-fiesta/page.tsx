"use client";

import ReleaseGamePage from "@/components/games/ReleaseGamePage";
import { Sparkles, ShieldCheck, Flame } from "lucide-react";

export default function PiñataFiestaPage() {
  return (
    <ReleaseGamePage
      badge="POPULAR"
      badgeTone="red"
      emoji="🪅"
      title="Piñata Fiesta"
      subtitle="Rompe la piñata y suelta una lluvia de premios."
      description="La sala entra con identidad mexicana, timing agresivo y una UI que no se ve genérica. Aquí lo importante es que cada caída y cada bonus se lean con claridad y energía."
      stats={[
        { label: "RTP", value: "96.5%" },
        { label: "Max Win", value: "3,500x" },
        { label: "Volatilidad", value: "Media" },
      ]}
      features={[
        { title: "Lluvia de bonus", copy: "Efecto festivo con una estructura seria y legible.", icon: Flame },
        { title: "Ajuste móvil", copy: "Pensado para verse fuerte en pantalla chica.", icon: Sparkles },
        { title: "Operación HOCKER", copy: "Listo para bonos, control y trazabilidad interna.", icon: ShieldCheck },
      ]}
      progress={[
        { label: "UI / layout", value: 100 },
        { label: "FX / feedback", value: 100 },
        { label: "Motor provider", value: 56 },
      ]}
      note="Sala lista para producción visual."
      actions={[
        { label: "Preparar saldo", href: "/wallet?tab=deposit" },
        { label: "Ver promos", href: "/promos", variant: "secondary" },
      ]}
    />
  );
}