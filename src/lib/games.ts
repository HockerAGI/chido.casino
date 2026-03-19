export type GameCategory = "slots" | "crash" | "live" | "sports" | "arcade";
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
};

export const GAMES: Game[] = [
  {
    id: "taco-slot",
    title: "Taco Slot",
    subtitle: "Giros locos con sabor a México ¡pura chida!",
    badge: "HOT",
    category: "slots",
    href: "/games/taco-slot",
    status: "hot",
    rtp: "96.5%",
    maxWin: "2,000x",
    volatility: "media",
    provider: "Chido Studios",
    gradient: "from-[#FF0099]/30 to-[#FF3D00]/20",
    emoji: "🌮",
    tags: ["original", "exclusivo"],
  },
  {
    id: "crash",
    title: "Chido Crash",
    subtitle: "Multiplica hasta 1000x y retira a tiempo, ¡no te confíes!",
    badge: "LIVE",
    category: "crash",
    href: "/games/crash",
    status: "live",
    rtp: "97%",
    maxWin: "∞",
    volatility: "alta",
    provider: "Chido Studios",
    gradient: "from-[#00F0FF]/30 to-[#32CD32]/20",
    emoji: "🚀",
    tags: ["original", "provably fair"],
  },
  {
    id: "azteca-wild",
    title: "Azteca Wild",
    subtitle: "Pirámides, wilds en cascada y hasta 5,000x de fortuna",
    badge: "NUEVO",
    category: "slots",
    href: "/games/azteca-wild",
    status: "new",
    rtp: "96.8%",
    maxWin: "5,000x",
    volatility: "alta",
    provider: "Chido Studios",
    gradient: "from-[#FFD700]/20 to-[#FF6B00]/20",
    emoji: "🏛️",
    tags: ["cascada", "megaways"],
  },
  {
    id: "lucha-megaways",
    title: "Lucha Libre Megaways",
    subtitle: "Enmascarados con wilds que vuelan y free spins épicos",
    badge: "NUEVO",
    category: "slots",
    href: "/games/lucha-megaways",
    status: "new",
    rtp: "96.2%",
    maxWin: "8,500x",
    volatility: "alta",
    provider: "Chido Studios",
    gradient: "from-[#FF0000]/20 to-[#0000FF]/20",
    emoji: "🥊",
    tags: ["megaways", "exclusivo"],
  },
  {
    id: "catrina-bonanza",
    title: "Catrina Bonanza",
    subtitle: "Día de muertos, scatters y bonos que resurgen",
    badge: "HOT",
    category: "slots",
    href: "/games/catrina-bonanza",
    status: "hot",
    rtp: "96.0%",
    maxWin: "10,000x",
    volatility: "alta",
    provider: "Chido Studios",
    gradient: "from-[#A855F7]/25 to-[#EC4899]/20",
    emoji: "💀",
    tags: ["día de muertos", "bonanza"],
  },
  {
    id: "piñata-fiesta",
    title: "Piñata Fiesta",
    subtitle: "Rompe la piñata y llueven los bonos ¡que curado!",
    badge: "POPULAR",
    category: "slots",
    href: "/games/piñata-fiesta",
    status: "live",
    rtp: "96.5%",
    maxWin: "3,500x",
    volatility: "media",
    provider: "Chido Studios",
    gradient: "from-[#FBBF24]/25 to-[#EF4444]/20",
    emoji: "🪅",
    tags: ["festivo", "clásico"],
  },
  {
    id: "chido-roulette",
    title: "Ruleta Chida",
    subtitle: "Crupier real, streaming HD — apuesta y que el destino decida",
    badge: "LIVE",
    category: "live",
    href: "/games/ruleta-chida",
    status: "coming_soon",
    provider: "Live Chido",
    gradient: "from-[#10B981]/20 to-[#059669]/20",
    emoji: "🎡",
    tags: ["live dealer", "en vivo"],
  },
  {
    id: "blackjack-vip",
    title: "Blackjack VIP",
    subtitle: "Mesa privada para Nivel Habanero y Salsa — juega como los grandes",
    badge: "VIP",
    category: "live",
    href: "/games/blackjack-vip",
    status: "coming_soon",
    provider: "Live Chido",
    gradient: "from-[#1E3A5F]/30 to-[#2563EB]/20",
    emoji: "🃏",
    tags: ["VIP", "live dealer"],
  },
  {
    id: "baccarat-pro",
    title: "Baccarat Pro",
    subtitle: "El juego de las altas apuestas — sin complicaciones, pura acción",
    badge: "LIVE",
    category: "live",
    href: "/games/baccarat-pro",
    status: "coming_soon",
    provider: "Live Chido",
    gradient: "from-[#7C3AED]/20 to-[#4C1D95]/20",
    emoji: "🎴",
    tags: ["live dealer", "baccarat"],
  },
  {
    id: "turbo-plinko",
    title: "Turbo Plinko",
    subtitle: "Deja caer la bolita y espera los multiplicadores ¡hasta 1,000x!",
    badge: "NUEVO",
    category: "arcade",
    href: "/games/turbo-plinko",
    status: "new",
    rtp: "97%",
    maxWin: "1,000x",
    volatility: "media",
    provider: "Chido Studios",
    gradient: "from-[#06B6D4]/20 to-[#3B82F6]/20",
    emoji: "⚡",
    tags: ["plinko", "fast"],
  },
  {
    id: "futbol-fantasy",
    title: "Predictor Fútbol MX",
    subtitle: "Predice resultados de la Liga MX y gana bonos reales",
    badge: "PRONTO",
    category: "sports",
    href: "/games/futbol-mx",
    status: "coming_soon",
    provider: "Chido Sports",
    gradient: "from-[#16A34A]/20 to-[#15803D]/20",
    emoji: "⚽",
    tags: ["deportes", "liga mx"],
  },
  {
    id: "sweet-bonanza-chida",
    title: "Bonanza Dulce",
    subtitle: "Cluster pays con multiplicadores locos — pura dulzura explosiva",
    badge: "POPULAR",
    category: "slots",
    href: "/games/bonanza-dulce",
    status: "live",
    rtp: "96.5%",
    maxWin: "21,100x",
    volatility: "alta",
    provider: "Chido Studios",
    gradient: "from-[#F472B6]/25 to-[#EC4899]/15",
    emoji: "🍬",
    tags: ["cluster", "megaways"],
  },
];

export function getGamesByCategory(category?: GameCategory) {
  if (!category) return GAMES;
  return GAMES.filter((g) => g.category === category);
}

export function getLiveGames() {
  return GAMES.filter((g) => g.status === "live" || g.status === "hot" || g.status === "new");
}

export const CATEGORY_LABELS: Record<GameCategory, string> = {
  slots: "Slots",
  crash: "Crash",
  live: "Casino En Vivo",
  sports: "Deportes",
  arcade: "Arcade",
};
