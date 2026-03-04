"use client";

import { useEffect, useState } from "react";
import { Trophy, Flame, Medal, Loader2, ChevronRight, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import Link from "next/link";

type Row = { rank: number; user: string; points: number; profit: number; wager: number; plays: number };

export default function TournamentsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [since, setSince] = useState<string>("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tournaments/leaderboard", { cache: "no-store" });
      const json = await res.json();
      setRows((json?.leaderboard || []) as Row[]);
      setSince(String(json?.period?.since || ""));
    } catch {
      setRows([]);
      setSince("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen pb-20 animate-fade-in">
      <div className="relative bg-[#121214] border-b border-white/5 py-12 px-6 overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#FF0099]/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-6xl mx-auto relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF0099]/10 text-[#FF0099] text-xs font-black uppercase tracking-widest mb-4 border border-[#FF0099]/20">
              <Trophy size={14} /> Ranking en vivo
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white mb-2 tracking-tighter">
              TORNEOS{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF0099] to-[#FF5E00]">
                CHIDOS
              </span>
            </h1>
            <p className="text-zinc-400 max-w-xl text-lg font-medium">
              Ranking real basado en juego reciente. Sin nombres fake, sin números inventados.
            </p>
            <div className="mt-3 text-xs text-white/50 flex items-center gap-2">
              <Info size={14} /> Periodo: últimos 7 días {since ? `(desde ${new Date(since).toLocaleString()})` : ""}
            </div>
          </div>

          <div className="bg-black/50 border border-white/10 p-6 rounded-3xl backdrop-blur-md text-center md:text-right flex-shrink-0">
            <div className="text-xs text-zinc-500 uppercase font-bold tracking-widest mb-1">Cómo se suman puntos</div>
            <div className="text-sm text-white/70">
              Crash: <b>apuesta × auto-cashout</b> (si cobras). <br />
              Slot: <b>apuesta × multiplicador</b>.
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10 grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center gap-3 mb-2">
            <Flame className="text-[#FF5E00]" size={24} />
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Cartelera</h2>
          </div>

          <Card className="relative overflow-hidden bg-gradient-to-br from-[#1A1A1D] to-[#121214] border-[#00F0FF]/30 p-1">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#00F0FF]/10 blur-3xl rounded-full" />
            <div className="bg-[#121214] rounded-2xl p-6 relative z-10">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-5">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[#32CD32]/10 text-[#32CD32] text-[10px] font-black uppercase tracking-widest border border-[#32CD32]/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#32CD32]" /> En vivo
                  </div>
                  <h3 className="text-2xl font-black text-white mt-3">Crash Rush • 7 días</h3>
                  <p className="text-sm text-zinc-400 mt-1">
                    Multiplicadores altos te suben más rápido.
                  </p>
                </div>

                <div className="text-left md:text-right">
                  <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Acción</div>
                  <Link
                    href="/games/crash"
                    className="inline-flex items-center justify-center mt-2 rounded-xl bg-[#00F0FF] text-black font-black px-5 py-3 hover:opacity-90"
                  >
                    Jugar Crash →
                  </Link>
                </div>
              </div>

              <div className="text-xs text-white/60 bg-black/40 p-3 rounded-xl border border-white/5">
                *Este ranking se calcula con datos reales de <b>crash_bets</b> y <b>slot_spins</b>. Se actualiza cada ~20s.
              </div>
            </div>
          </Card>

          <Card className="bg-[#1A1A1D] border-white/5 p-6 rounded-2xl">
            <div className="text-lg font-black">Recompensas (configurable)</div>
            <div className="text-sm text-white/65 mt-2">
              Si vas a soltar bolsa/premios, configúralo desde Admin (HOCKER ONE) o reglas internas.
              Aquí no se muestra nada inventado.
            </div>
          </Card>
        </div>

        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Medal className="text-[#FFD700]" size={24} />
              <h2 className="text-xl font-black text-white uppercase tracking-tight">Top Ranking</h2>
            </div>
          </div>

          <Card className="bg-[#121214] border-white/5 p-2 rounded-3xl overflow-hidden">
            <div className="bg-[#1A1A1D] rounded-2xl p-4">
              {loading ? (
                <div className="flex items-center gap-2 text-white/70">
                  <Loader2 className="animate-spin" size={16} /> Cargando leaderboard…
                </div>
              ) : rows.length === 0 ? (
                <div className="text-sm text-white/60">
                  Aún no hay datos suficientes. Juega Crash / Taco Slot y entra al ranking.
                </div>
              ) : (
                <div className="space-y-2">
                  {rows.slice(0, 10).map((p) => (
                    <div
                      key={p.rank}
                      className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-black/30"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-black text-lg text-[#FFD700]">#{p.rank}</span>
                        <span className="font-bold text-white text-sm">{p.user}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-[#00F0FF] text-sm">
                          {p.points.toLocaleString()} <span className="text-[10px] text-zinc-500 uppercase">pts</span>
                        </div>
                        <div className="text-[11px] text-white/45">
                          profit {p.profit >= 0 ? "+" : ""}{p.profit} • wager {p.wager}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Link
                href="/lobby"
                className="w-full mt-4 text-xs font-bold text-zinc-500 hover:text-white flex items-center justify-center gap-1 transition-colors"
              >
                Volver al Lobby <ChevronRight size={14} />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}