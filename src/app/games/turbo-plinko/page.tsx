"use client";

import ReleaseGamePage from "@/components/games/ReleaseGamePage";
import { ShieldCheck, Sparkles, Zap } from "lucide-react";

export default function TurboPlinkoPage() {
  return (
    <ReleaseGamePage
      badge="ARCADE"
      badgeTone="cyan"
      emoji="⚡"
      title="Turbo Plinko"
      subtitle="Caída rápida, lectura limpia y tensión de arcade."
      description="Plinko necesita claridad extrema: trayectoria, rebote y premio se tienen que entender de un vistazo. Aquí queda con estética eléctrica, feedback fuerte y una base visual lista para release."
      stats={[
        { label: "RTP", value: "97.0%" },
        { label: "Max Win", value: "1,000x" },
        { label: "Modo", value: "Arcade" },
      ]}
      features={[
        { title: "Caída precisa", copy: "La sensación de caída debe ser inmediata y adictiva.", icon: Zap },
        { title: "Visual limpio", copy: "Nada de ruido visual; todo apunta al resultado.", icon: Sparkles },
        { title: "Control HOCKER", copy: "Arquitectura lista para bonos, balance y trazabilidad.", icon: ShieldCheck },
      ]}
      progress={[
        { label: "UX / gamefeel", value: 100 },
        { label: "Motion", value: 100 },
        { label: "Engine hook", value: 63 },
      ]}
      note="Sala arcade lista para integración."
      actions={[
        { label: "Preparar saldo", href: "/wallet?tab=deposit" },
        { label: "Ver lobby", href: "/lobby", variant: "secondary" },
      ]}
    />
  );
}