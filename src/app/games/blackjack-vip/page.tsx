"use client";

import ReleaseGamePage from "@/components/games/ReleaseGamePage";
import { Crown, ShieldCheck, Sparkles } from "lucide-react";

export default function BlackjackVipPage() {
  return (
    <ReleaseGamePage
      badge="VIP TABLE"
      badgeTone="amber"
      emoji="♠️"
      title="Blackjack VIP"
      subtitle="Mesa privada con look premium, lista para dealer y side bets."
      description="Aquí la mesa tiene que sentirse cara, limpia y rápida. El layout ya queda preparado para cartas, historial, decisiones y una experiencia VIP de verdad."
      stats={[
        { label: "Mesa", value: "Privada" },
        { label: "Modo", value: "Live" },
        { label: "Estado", value: "Ready" },
      ]}
      features={[
        { title: "Look VIP", copy: "La sala se siente de alto valor desde el primer frame.", icon: Crown },
        { title: "UX de mesa", copy: "Pensada para decisiones rápidas y lectura simple.", icon: Sparkles },
        { title: "Operación central", copy: "Lista para hooks de HOCKER One y supervisión.", icon: ShieldCheck },
      ]}
      progress={[
        { label: "Mesa UI", value: 100 },
        { label: "Cards & history", value: 100 },
        { label: "Dealer integration", value: 66 },
      ]}
      note="Mesa lista como front premium."
      actions={[
        { label: "Ver VIP", href: "/vip" },
        { label: "Volver al lobby", href: "/lobby", variant: "secondary" },
      ]}
    />
  );
}