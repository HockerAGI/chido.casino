export type PlayerLevel = {
  key: "verde" | "jalapeno" | "serrano" | "habanero" | "salsa";
  label: string;
  badge: string;
  minXp: number;
  nextXp: number | null;
};

const LEVELS: PlayerLevel[] = [
  { key: "verde", label: "Nivel Verde", badge: "/badge-verde.png", minXp: 0, nextXp: 500 },
  { key: "jalapeno", label: "Nivel Jalapeño", badge: "/badge-jalapeno.png", minXp: 500, nextXp: 1500 },
  { key: "serrano", label: "Nivel Serrano", badge: "/badge-serrano.png", minXp: 1500, nextXp: 3000 },
  { key: "habanero", label: "Nivel Habanero", badge: "/badge-habanero.png", minXp: 3000, nextXp: 6000 },
  { key: "salsa", label: "Nivel Salsa (Pro)", badge: "/badge-salsa.png", minXp: 6000, nextXp: null },
];

export function getPlayerLevel(xpRaw: any): { level: PlayerLevel; pctToNext: number } {
  const xp = Number(xpRaw || 0);
  const safeXp = Number.isFinite(xp) ? Math.max(0, xp) : 0;

  let level = LEVELS[0];
  for (const l of LEVELS) {
    if (safeXp >= l.minXp) level = l;
  }

  if (!level.nextXp) return { level, pctToNext: 100 };
  const span = level.nextXp - level.minXp;
  const inSpan = safeXp - level.minXp;
  const pct = span > 0 ? Math.max(0, Math.min(100, Math.round((inSpan / span) * 100))) : 0;

  return { level, pctToNext: pct };
}