"use client";

import ReleaseGamePage from "@/components/games/ReleaseGamePage";
import { ShieldCheck, Sparkles, Radio } from "lucide-react";

export default function RuletaChidaPage() {
  return (
    <ReleaseGamePage
      badge="LIVE TABLE"
      badgeTone="cyan"
      emoji="🎡"
      title="Ruleta Chida"
      subtitle="Mesa con intención premium, no una maqueta vacía."
      description="Una ruleta con dirección visual limpia, espacios listos para dealer, historial, bets, streaks y una experiencia que sí parece de casino serio. La estética está pensada para live-table real."
      stats={[
        { label: "Mesa", value: "HD" },
        { label: "Modo", value: "En vivo" },
        { label: "Estado", value: "Ready" },
      ]}
      features={[
        { title: "Mesa viva", copy: "Layout listo para dealer, fichas y feed de resultados.", icon: Radio },
        { title: "Feedback premium", copy: "Animación, contraste y jerarquía visual limpia.", icon: Sparkles },
        { title: "Control central", copy: "Conexión preparada para HOCKER One y administración.", icon: ShieldCheck },
      ]}
      progress={[
        { label: "Table UI", value: 100 },
        { label: "History/roadmap", value: 100 },
        { label: "Provider dealer", value: 64 },
      ]}
      note="Sala de mesa preparada para live integration."
      actions={[
        { label: "Ver soporte", href: "/support" },
        { label: "Volver al lobby", href: "/lobby", variant: "secondary" },
      ]}
    />
  );
}