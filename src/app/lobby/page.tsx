import Image from "next/image";
import Link from "next/link";

export default function LobbyPage() {
  return (
    <div className="relative min-h-[calc(100vh-80px)]">
      {/* Fondo México (ya existe en public) */}
      <div className="absolute inset-0 -z-10">
        <Image src="/hero-bg.jpg" alt="Fondo" fill className="object-cover opacity-30" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/65 to-black/85" />
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 py-10 space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Image src="/chido-logo.png" alt="Logo" width={180} height={48} className="h-auto w-[180px]" />
          <div className="text-sm text-white/65">
            Elige tu juego. Taco-Slot es el principal. Crash está listo.
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Taco Slot */}
          <Link
            href="/games/taco-slot"
            className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition"
          >
            <div className="absolute inset-0 opacity-20">
              <Image src="/hero-bg.jpg" alt="bg" fill className="object-cover" />
            </div>
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Principal
                </div>
                <div className="mt-3 text-3xl font-semibold tracking-tight">Taco-Slot</div>
                <div className="mt-1 text-sm text-white/70">
                  Gira chiles, sube nivel, cobra en caliente 🔥
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Image src="/badge-verde.png" alt="verde" width={44} height={44} />
                <Image src="/badge-jalapeno.png" alt="jalapeno" width={44} height={44} />
                <Image src="/badge-serrano.png" alt="serrano" width={44} height={44} />
                <Image src="/badge-habanero.png" alt="habanero" width={44} height={44} />
              </div>
            </div>

            <div className="relative mt-5 rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white/75">
              Paytable rápido: Verde x3=3x · Jalapeño x3=5x · Serrano x3=10x · Habanero x3=20x · Par=1.5x
              <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 font-semibold group-hover:bg-white/15">
                Jugar Taco-Slot →
              </div>
            </div>
          </Link>

          {/* Crash */}
          <Link
            href="/games/crash"
            className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition"
          >
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                Classic
              </div>
              <div className="mt-3 text-3xl font-semibold tracking-tight">Crash</div>
              <div className="mt-1 text-sm text-white/70">
                Elige multiplicador objetivo. Si el crash lo supera, ganas.
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white/75">
                Endpoint listo: <span className="font-mono text-white/85">/api/games/crash/play</span>
                <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 font-semibold group-hover:bg-white/15">
                  Jugar Crash →
                </div>
              </div>
            </div>
          </Link>
        </div>

        <div className="text-center text-xs text-white/45">
          Lobby actualizado — rutas limpias, assets en /public, sin imports raros.
        </div>
      </div>
    </div>
  );
}