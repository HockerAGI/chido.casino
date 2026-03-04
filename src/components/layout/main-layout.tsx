"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { useWalletBalance } from "@/lib/useWalletBalance";
import { supabaseBrowser } from "@/lib/supabase/browser";
import {
  LayoutGrid,
  Gamepad2,
  Gift,
  UserCircle,
  Wallet,
  Menu,
  X,
  Headphones,
  Users,
  LogOut,
  ShieldCheck,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: any;
};

const primaryNav: NavItem[] = [
  { href: "/lobby", label: "Lobby", icon: LayoutGrid },
  { href: "/games/crash", label: "Crash", icon: Gamepad2 },
  { href: "/promos", label: "Bonos", icon: Gift },
  { href: "/profile", label: "Perfil", icon: UserCircle },
];

const drawerNav: NavItem[] = [
  { href: "/wallet", label: "Bóveda", icon: Wallet },
  { href: "/affiliates", label: "Afiliados", icon: Users },
  { href: "/support", label: "Soporte", icon: Headphones },
  { href: "/legal", label: "Legal", icon: ShieldCheck },
];

function isActive(pathname: string, href: string) {
  if (href === "/lobby") return pathname === "/lobby";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { formatted, loading } = useWalletBalance();

  const [drawerOpen, setDrawerOpen] = useState(false);

  const centerAction = useMemo(
    () => ({ href: "/games/taco-slot", label: "Taco", icon: LayoutGrid }),
    []
  );

  const signOut = async () => {
    try {
      await supabaseBrowser().auth.signOut();
    } catch {
      // ignore
    } finally {
      setDrawerOpen(false);
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      {/* ========== MOBILE HEADER ========== */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 glass-panel border-b border-white/5">
        <div className="h-14 px-4 flex items-center justify-between">
          <Link href="/lobby" className="flex items-center gap-2">
            <Logo variant="iso-color" size={34} />
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/wallet"
              className="flex items-center gap-2 rounded-full bg-black/40 border border-white/10 px-3 py-2"
              aria-label="Abrir bóveda"
            >
              <span className="text-[10px] uppercase tracking-widest text-white/60 font-bold">
                Saldo
              </span>
              <span className="text-sm font-black tabular-nums text-[#32CD32]">
                {loading ? "..." : formatted}
              </span>
            </Link>

            <button
              onClick={() => setDrawerOpen(true)}
              className="h-10 w-10 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center"
              aria-label="Abrir menú"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* ========== DESKTOP SIDEBAR ========== */}
      <div className="hidden lg:flex min-h-screen">
        <aside className="w-64 bg-[#121214] border-r border-white/5 flex flex-col">
          <div className="h-20 flex items-center px-6 border-b border-white/5">
            <Link href="/lobby" className="flex items-center gap-2">
              <Logo variant="full" size={120} className="object-contain" />
            </Link>
          </div>

          <nav className="flex-1 py-6 px-3 space-y-1">
            {[...primaryNav, ...drawerNav].map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? "bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                      : "text-zinc-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon size={18} className={active ? "text-[#00F0FF]" : ""} />
                  {item.label}
                </Link>
              );
            })}

            <button
              onClick={signOut}
              className="w-full mt-4 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-zinc-400 hover:bg-white/5 hover:text-white"
            >
              <LogOut size={18} />
              Cerrar sesión
            </button>
          </nav>

          <div className="p-4 border-t border-white/5">
            <div className="text-[10px] text-zinc-600 px-1">
              v1.0.0 • Chido Casino
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 sticky top-0 z-40 glass-panel border-b border-white/5 px-6 flex items-center justify-between">
            <div />
            <Link
              href="/wallet"
              className="group flex items-center gap-3 bg-[#1A1A1D] hover:bg-[#222] border border-white/10 rounded-full px-1 pl-4 py-1 transition-all"
            >
              <div className="flex flex-col items-end leading-none mr-1">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                  Saldo
                </span>
                <span className="text-sm font-bold tabular-nums text-white">
                  {loading ? "..." : formatted}
                </span>
              </div>
              <div className="h-8 w-8 rounded-full bg-[#00F0FF] text-black flex items-center justify-center font-bold">
                <Wallet size={16} />
              </div>
            </Link>
          </header>

          <main className="flex-1 overflow-y-auto p-8">
            <div className="max-w-7xl mx-auto">{children}</div>
          </main>
        </div>
      </div>

      {/* ========== MOBILE CONTENT WRAPPER ========== */}
      <main className="lg:hidden pt-14 pb-24 px-4">
        <div className="max-w-3xl mx-auto">{children}</div>
      </main>

      {/* ========== MOBILE BOTTOM NAV ========== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
        <div className="mx-auto max-w-3xl px-4 pb-4">
          <div className="relative rounded-3xl border border-white/10 bg-black/60 backdrop-blur-xl">
            <div className="grid grid-cols-5 items-center">
              <Link
                href="/lobby"
                className={`py-3 flex flex-col items-center gap-1 text-[11px] font-bold ${
                  isActive(pathname, "/lobby")
                    ? "text-[#00F0FF]"
                    : "text-white/60"
                }`}
                aria-label="Lobby"
              >
                <LayoutGrid size={18} />
                Lobby
              </Link>

              <Link
                href="/games/crash"
                className={`py-3 flex flex-col items-center gap-1 text-[11px] font-bold ${
                  isActive(pathname, "/games/crash")
                    ? "text-[#00F0FF]"
                    : "text-white/60"
                }`}
                aria-label="Crash"
              >
                <Gamepad2 size={18} />
                Crash
              </Link>

              <Link
                href={centerAction.href}
                className="py-3 flex flex-col items-center gap-1 text-[11px] font-bold"
                aria-label="Taco Slot"
              >
                <div className="-mt-7 h-14 w-14 rounded-full bg-gradient-to-b from-[#FF0099] to-[#FF3D00] flex items-center justify-center shadow-[0_0_30px_rgba(255,0,153,0.35)] border border-white/10">
                  <Logo variant="iso-bw" size={28} className="hover:scale-100" />
                </div>
                <span className="text-white/80">Jugar</span>
              </Link>

              <Link
                href="/promos"
                className={`py-3 flex flex-col items-center gap-1 text-[11px] font-bold ${
                  isActive(pathname, "/promos")
                    ? "text-[#FF0099]"
                    : "text-white/60"
                }`}
                aria-label="Bonos"
              >
                <Gift size={18} />
                Bonos
              </Link>

              <Link
                href="/profile"
                className={`py-3 flex flex-col items-center gap-1 text-[11px] font-bold ${
                  isActive(pathname, "/profile")
                    ? "text-[#00F0FF]"
                    : "text-white/60"
                }`}
                aria-label="Perfil"
              >
                <UserCircle size={18} />
                Perfil
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ========== MOBILE DRAWER ========== */}
      {drawerOpen ? (
        <div className="lg:hidden fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setDrawerOpen(false)}
          />

          <div className="absolute top-0 right-0 h-full w-[86%] max-w-sm bg-[#121214] border-l border-white/10 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Logo variant="full" size={110} className="hover:scale-100" />
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="h-10 w-10 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center"
                aria-label="Cerrar menú"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="text-[10px] uppercase tracking-widest text-white/60 font-bold">
                Saldo
              </div>
              <div className="mt-1 text-lg font-black tabular-nums text-[#32CD32]">
                {loading ? "..." : formatted}
              </div>
              <Link
                href="/wallet"
                onClick={() => setDrawerOpen(false)}
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white text-black px-4 py-2 text-sm font-black"
              >
                <Wallet size={16} />
                Abrir bóveda
              </Link>
            </div>

            <div className="mt-6 space-y-1">
              {drawerNav.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold ${
                      active
                        ? "bg-white/10 text-white"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Icon size={18} className={active ? "text-[#00F0FF]" : ""} />
                    {item.label}
                  </Link>
                );
              })}

              <button
                onClick={signOut}
                className="w-full mt-2 flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-white/70 hover:bg-white/5 hover:text-white"
              >
                <LogOut size={18} />
                Cerrar sesión
              </button>
            </div>

            <div className="absolute bottom-5 left-5 right-5 text-[11px] text-white/35">
              <div className="flex items-center justify-between">
                <span>v1.0.0</span>
                <span className="font-black">18+ • Juega responsable</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}