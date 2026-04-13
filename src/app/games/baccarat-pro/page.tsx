"use client";

import ReleaseGamePage from "@/components/games/ReleaseGamePage";
import { ShieldCheck, Sparkles, Crown } from "lucide-react";

export default function BaccaratProPage() {
  return (
    <ReleaseGamePage
      badge="LIVE TABLE"
      badgeTone="cyan"
      emoji="♦️"
      title="Baccarat Pro"
      subtitle="Mesa sobria, elegante y lista para tráfico premium."
      description="Baccarat necesita pulcritud. Esta sala queda con actitud ejecutiva, contraste fuerte y espacio para historial, apuestas y flujo de dealer sin ruido visual."
      stats={[
        { label: "Mesa", value: "Pro" },
        { label: "Modo", value: "En vivo" },
        { label: "Estado", value: "Ready" },
      ]}
      features={[
        { title: "Elegancia real", copy: "Diseño sobrio que se siente caro y claro.", icon: Crown },
        { title: "Lectura inmediata", copy: "El jugador entiende el estado sin buscar demasiado.", icon: Sparkles },
        { title: "Control HOCKER", copy: "Base lista para administración y monitoreo central.", icon: ShieldCheck },
      ]}
      progress={[
        { label: "Visual system", value: 100 },
        { label: "Tables flow", value: 100 },
        { label: "Dealer link", value: 65 },
      ]}
      note="Mesa premium lista para live stack."
      actions={[
        { label: "Ver soporte", href: "/support" },
        { label: "Volver al lobby", href: "/lobby", variant: "secondary" },
      ]}
    />
  );
}