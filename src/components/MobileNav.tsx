"use client";

import Link from "next/link";
import { Home, Wallet, LogIn } from "lucide-react";
import { usePathname } from "next/navigation";

export default function MobileNav() {
  const pathname = usePathname();
  const active = (p: string) => (pathname === p ? "text-chido-cyan" : "text-white/55");

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 bg-chido-bg/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-around px-6 py-3">
        <Link className={`flex flex-col items-center gap-1 ${active("/")}`} href="/">
          <Home size={20} />
          <span className="text-[10px] font-bold">Inicio</span>
        </Link>

        <Link className={`flex flex-col items-center gap-1 ${active("/wallet")}`} href="/wallet">
          <Wallet size={20} />
          <span className="text-[10px] font-bold">Saldo</span>
        </Link>

        <Link className={`flex flex-col items-center gap-1 ${active("/login")}`} href="/login">
          <LogIn size={20} />
          <span className="text-[10px] font-bold">Entrar</span>
        </Link>
      </div>
    </div>
  );
}