"use client";

import ReleaseGamePage from "@/components/games/ReleaseGamePage";
import { Candy, Sparkles, ShieldCheck } from "lucide-react";

export default function BonanzaDulcePage() {
  return (
    <ReleaseGamePage
      badge="CLUSTER SLOT"
      badgeTone="pink"
      emoji="🍬"
      title="Bonanza Dulce"
      subtitle="La sala se ve dulce; el UX debe pegar duro."
      description="Cluster pays, explosiones de azúcar, multiplicadores y una dirección visual más grande que el promedio. No es una vitrina floja: queda con framing de producto serio, animación y lectura clara."
      stats={[
        { label: "RTP", value: "96.5%" },
        { label: "Max Win", value: "21,100x" },
        { label: "Modo", value: "Cluster" },
      ]}
      features={[
        { title: "Cluster pays", copy: "Pagos por agrupación con tensión visual y respuesta inmediata.", icon: Sparkles },
        { title: "Dulce con poder", copy: "Estética candy pero con peso de casino premium.", icon: Candy },
        { title: "Operación HOCKER", copy: "Capa lista para control, bonos y métricas centralizadas.", icon: ShieldCheck },
      ]}
      progress={[
        { label: "Interfaz", value: 100 },
        { label: "Efectos", value: 100 },
        { label: "Motor provider", value: 58 },
      ]}
      note="Sala lista como front premium."
      actions={[
        { label: "Preparar saldo", href: "/wallet?tab=deposit" },
        { label: "Ver promos", href: "/promos", variant: "secondary" },
      ]}
    />
  );
}