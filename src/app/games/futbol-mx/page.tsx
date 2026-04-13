"use client";

import ReleaseGamePage from "@/components/games/ReleaseGamePage";
import { ShieldCheck, Sparkles, Trophy } from "lucide-react";

export default function FutbolMxPage() {
  return (
    <ReleaseGamePage
      badge="SPORTS"
      badgeTone="green"
      emoji="⚽"
      title="Predictor Fútbol MX"
      subtitle="Deporte, métricas y apuesta con lenguaje claro."
      description="La capa deportiva queda armada para predicción, torneos y bonos ligados al rendimiento. La UI está pensada para lectura rápida, emoción y conexión directa con el ecosistema."
      stats={[
        { label: "Modo", value: "Sports" },
        { label: "Cobertura", value: "MX" },
        { label: "Estado", value: "Ready" },
      ]}
      features={[
        { title: "Señales claras", copy: "Panel limpio para decisiones y seguimiento.", icon: Trophy },
        { title: "Métricas vivas", copy: "Diseñado para insights, no para ruido.", icon: Sparkles },
        { title: "Operación central", copy: "Listo para administración vía HOCKER One.", icon: ShieldCheck },
      ]}
      progress={[
        { label: "Sports UX", value: 100 },
        { label: "Data hooks", value: 100 },
        { label: "Provider layer", value: 62 },
      ]}
      note="Módulo deportivo listo como front pro."
      actions={[
        { label: "Ver lobby", href: "/lobby" },
        { label: "Preparar saldo", href: "/wallet?tab=deposit", variant: "secondary" },
      ]}
    />
  );
}