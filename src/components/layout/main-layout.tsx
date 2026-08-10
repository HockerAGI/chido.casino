"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { supabaseBrowser } from "@/lib/supabase/browser";
import {
  Gamepad2,
  Headphones,
  LayoutGrid,
  LogOut,
  Menu,
  ShieldCheck,
  UserCircle,
  X,
} from "lucide-react";
import { Footer } from "./footer";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutGrid;
};

const navigation: NavItem[] = [
  { href: "/lobby", label: "Catálogo", icon: LayoutGrid },
  { href: "/games/taco-slot", label: "Taco Preview", icon: Gamepad2 },
  { href: "/games/crash", label: "Crash Preview", icon: Gamepad2 },
  { href: "/profile/kyc", label: "Verificación KYC", icon: ShieldCheck },
  { href: "/profile", label: "Mi cuenta", icon: UserCircle },
  { href: "/support", label: "Soporte", icon: Headphones },
  { href: "/legal", label: "Legal", icon: ShieldCheck },
];

function active(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const signOut = async () => {
    try {
      await supabaseBrowser().auth.signOut();
    } finally {
      setDrawerOpen(false);
      router.push("/login");
      router.refresh();
    }
  };

  const nav = (onNavigate?: () => void) => (
    <nav className="grid gap-1">
      {navigation.map((item) => {
        const Icon = item.icon;
        const selected = active(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
              selected
                ? "bg-white/10 text-white"
                : "text-zinc-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon size={18} className={selected ? "text-[#00F0FF]" : ""} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-black/75 backdrop-blur-xl lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/lobby" aria-label="CHIDO prelaunch">
            <Logo variant="iso-color" size={34} />
          </Link>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-[#FFD700]/20 bg-[#FFD700]/5 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#FFD700]">
              Sin dinero real
            </span>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/40"
              aria-label="Abrir menú"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="hidden min-h-screen lg:flex">
        <aside className="flex w-64 flex-col border-r border-white/5 bg-[#121214]">
          <div className="flex h-20 items-center border-b border-white/5 px-6">
            <Link href="/lobby">
              <Logo variant="full" size={120} className="object-contain" />
            </Link>
          </div>
          <div className="border-b border-white/5 p-4">
            <div className="rounded-2xl border border-[#FFD700]/20 bg-[#FFD700]/5 p-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-[#FFD700]">
                Prelaunch controlado
              </div>
              <p className="mt-2 text-xs leading-relaxed text-white/50">
                Sin depósitos, apuestas con dinero real ni premios monetarios.
              </p>
            </div>
          </div>
          <div className="flex-1 px-3 py-5">{nav()}</div>
          <div className="border-t border-white/5 p-4">
            <button
              type="button"
              onClick={signOut}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-zinc-400 hover:bg-white/5 hover:text-white"
            >
              <LogOut size={18} /> Cerrar sesión
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/5 bg-black/60 px-6 backdrop-blur-xl">
            <div className="text-xs font-black uppercase tracking-widest text-white/35">
              CHIDO — entorno de validación
            </div>
            <div className="rounded-full border border-[#FFD700]/20 bg-[#FFD700]/5 px-4 py-2 text-xs font-black text-[#FFD700]">
              Operación real deshabilitada
            </div>
          </header>
          <main className="flex-1 p-8">
            <div className="mx-auto max-w-7xl">
              {children}
              <div className="mt-10">
                <Footer />
              </div>
            </div>
          </main>
        </div>
      </div>

      <main className="px-4 pb-10 pt-20 lg:hidden">
        <div className="mx-auto max-w-3xl">
          {children}
          <div className="mt-10">
            <Footer />
          </div>
        </div>
      </main>

      {drawerOpen ? (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-black/75"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute right-0 top-0 h-full w-[86%] max-w-sm border-l border-white/10 bg-[#121214] p-5">
            <div className="flex items-center justify-between">
              <Logo variant="full" size={110} />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/40"
                aria-label="Cerrar menú"
              >
                <X size={20} />
              </button>
            </div>
            <div className="my-5 rounded-2xl border border-[#FFD700]/20 bg-[#FFD700]/5 p-4 text-xs leading-relaxed text-white/55">
              Prelaunch sin depósitos, apuestas con dinero real ni premios monetarios.
            </div>
            {nav(() => setDrawerOpen(false))}
            <button
              type="button"
              onClick={signOut}
              className="mt-5 flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
            >
              <LogOut size={18} /> Cerrar sesión
            </button>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
