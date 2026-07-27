"use client";

import ReleaseGamePage from "@/components/games/ReleaseGamePage";
import { Sparkles, ShieldCheck, Flame } from "lucide-react";

export default function CatrinaBonanzaPage() {
  return (
    <ReleaseGamePage
      badge="HOT SLOT"
      badgeTone="amber"
      emoji="💀"
      title="Catrina Bonanza"
      subtitle="Día de muertos con bonus modernos y presencia brutal, bien de a peso."
      description="Una sala que mezcla folclor, lujo visual y una lectura premium pensada pa' conversiones, no pa' verse improvisada. La Catrina entra con personalidad fuerte, multiplicadores y capas de presentación muy limpias, sin andar de chafa."
      stats={[
        { label: "RTP", value: "96.0%" },
        { label: "Max Win", value: "10,000x" },
        { label: "Volatilidad", value: "Alta" },
      ]}
      features={[
        { title: "Scatters vivos", copy: "Cada aparición debe sentirse como evento, no como adorno.", icon: Sparkles },
        { title: "Impacto visual", copy: "Colores, contraste y glow para que la sala destaque en móvil.", icon: Flame },
        { title: "Control central", copy: "Listo para enganchar bonos y lógica de backend del ecosistema.", icon: ShieldCheck },
      ]}
      progress={[
        { label: "UI / branded look", value: 100 },
        { label: "Animation stack", value: 100 },
        { label: "Provider link", value: 60 },
      ]}
      note="Listo para release visual."
      actions={[
        { label: "Preparar saldo", href: "/wallet?tab=deposit" },
        { label: "Volver al lobby", href: "/lobby", variant: "secondary" },
      ]}
    />
  );
}