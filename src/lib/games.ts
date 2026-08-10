export type GameCategory =
  | "slots"
  | "crash"
  | "live"
  | "sports"
  | "arcade";
export type GameStatus = "live" | "coming_soon" | "new" | "hot";

export type Game = {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  category: GameCategory;
  href: string;
  status: GameStatus;
  rtp?: string;
  maxWin?: string;
  volatility?: "baja" | "media" | "alta";
  provider: string;
  gradient: string;
  emoji: string;
  tags?: string[];
  mathCertified?: boolean;
};

export const GAMES: Game[] = [
  {
    id: "taco-slot",
    title: "Taco Slot",
    subtitle: "Motor original en validación técnica",
    badge: "PREVIEW",
    category: "slots",
    href: "/games/taco-slot",
    status: "new",
    volatility: "media",
    provider: "Chido Studios",
    gradient: "from-[#FF0099]/30 to-[#FF3D00]/20",
    emoji: "🌮",
    tags: ["original", "preview", "sin dinero real"],
    mathCertified: false,
  },
  {
    id: "crash",
    title: "Chido Crash",
    subtitle: "Motor provably fair en validación técnica",
    badge: "PREVIEW",
    category: "crash",
    href: "/games/crash",
    status: "new",
    volatility: "alta",
    provider: "Chido Studios",
    gradient: "from-[#00F0FF]/30 to-[#32CD32]/20",
    emoji: "🚀",
    tags: ["original", "provably fair", "sin dinero real"],
    mathCertified: false,
  },
  {
    id: "azteca-wild",
    title: "Azteca Wild",
    subtitle: "Concepto visual; motor no liberado",
    badge: "CONCEPTO",
    category: "slots",
    href: "/games/azteca-wild",
    status: "coming_soon",
    provider: "Chido Studios",
    gradient: "from-[#FFD700]/20 to-[#FF6B00]/20",
    emoji: "🏛️",
    tags: ["concepto", "no jugable"],
    mathCertified: false,
  },
  {
    id: "lucha-megaways",
    title: "Lucha Libre Megaways",
    subtitle: "Concepto visual; motor no liberado",
    badge: "CONCEPTO",
    category: "slots",
    href: "/games/lucha-megaways",
    status: "coming_soon",
    provider: "Chido Studios",
    gradient: "from-[#FF0000]/20 to-[#0000FF]/20",
    emoji: "🥊",
    tags: ["concepto", "no jugable"],
    mathCertified: false,
  },
  {
    id: "catrina-bonanza",
    title: "Catrina Bonanza",
    subtitle: "Concepto visual; motor no liberado",
    badge: "CONCEPTO",
    category: "slots",
    href: "/games/catrina-bonanza",
    status: "coming_soon",
    provider: "Chido Studios",
    gradient: "from-[#A855F7]/25 to-[#EC4899]/20",
    emoji: "💀",
    tags: ["concepto", "no jugable"],
    mathCertified: false,
  },
  {
    id: "pinata-fiesta",
    title: "Piñata Fiesta",
    subtitle: "Concepto visual; motor no liberado",
    badge: "CONCEPTO",
    category: "slots",
    href: "/games/pinata-fiesta",
    status: "coming_soon",
    provider: "Chido Studios",
    gradient: "from-[#FBBF24]/25 to-[#EF4444]/20",
    emoji: "🪅",
    tags: ["concepto", "no jugable"],
    mathCertified: false,
  },
  {
    id: "chido-roulette",
    title: "Ruleta Chida",
    subtitle: "Concepto; sin proveedor live autorizado",
    badge: "PRONTO",
    category: "live",
    href: "/games/ruleta-chida",
    status: "coming_soon",
    provider: "Chido Studios",
    gradient: "from-[#10B981]/20 to-[#059669]/20",
    emoji: "🎡",
    tags: ["concepto", "no jugable"],
    mathCertified: false,
  },
  {
    id: "blackjack-vip",
    title: "Blackjack VIP",
    subtitle: "Concepto; sin proveedor live autorizado",
    badge: "PRONTO",
    category: "live",
    href: "/games/blackjack-vip",
    status: "coming_soon",
    provider: "Chido Studios",
    gradient: "from-[#1E3A5F]/30 to-[#2563EB]/20",
    emoji: "🃏",
    tags: ["concepto", "no jugable"],
    mathCertified: false,
  },
  {
    id: "baccarat-pro",
    title: "Baccarat Pro",
    subtitle: "Concepto; sin proveedor live autorizado",
    badge: "PRONTO",
    category: "live",
    href: "/games/baccarat-pro",
    status: "coming_soon",
    provider: "Chido Studios",
    gradient: "from-[#7C3AED]/20 to-[#4C1D95]/20",
    emoji: "🎴",
    tags: ["concepto", "no jugable"],
    mathCertified: false,
  },
  {
    id: "turbo-plinko",
    title: "Turbo Plinko",
    subtitle: "Concepto visual; motor no liberado",
    badge: "CONCEPTO",
    category: "arcade",
    href: "/games/turbo-plinko",
    status: "coming_soon",
    provider: "Chido Studios",
    gradient: "from-[#06B6D4]/20 to-[#3B82F6]/20",
    emoji: "⚡",
    tags: ["concepto", "no jugable"],
    mathCertified: false,
  },
  {
    id: "futbol-fantasy",
    title: "Predictor Fútbol MX",
    subtitle: "Concepto sujeto a revisión legal",
    badge: "PRONTO",
    category: "sports",
    href: "/games/futbol-mx",
    status: "coming_soon",
    provider: "Chido Studios",
    gradient: "from-[#16A34A]/20 to-[#15803D]/20",
    emoji: "⚽",
    tags: ["concepto", "no jugable"],
    mathCertified: false,
  },
  {
    id: "sweet-bonanza-chida",
    title: "Bonanza Dulce",
    subtitle: "Concepto visual; motor no liberado",
    badge: "CONCEPTO",
    category: "slots",
    href: "/games/bonanza-dulce",
    status: "coming_soon",
    provider: "Chido Studios",
    gradient: "from-[#F472B6]/25 to-[#EC4899]/15",
    emoji: "🍬",
    tags: ["concepto", "no jugable"],
    mathCertified: false,
  },
];

export function getGamesByCategory(category?: GameCategory) {
  if (!category) return GAMES;
  return GAMES.filter((game) => game.category === category);
}

/**
 * Compatibility helper: during prelaunch it returns only the two engines that
 * have executable routes. "Live" here means preview-visible, never licensed or
 * real-money authorized.
 */
export function getLiveGames() {
  return GAMES.filter((game) => game.status !== "coming_soon");
}

export const CATEGORY_LABELS: Record<GameCategory, string> = {
  slots: "Slots",
  crash: "Crash",
  live: "Casino En Vivo",
  sports: "Deportes",
  arcade: "Arcade",
};
