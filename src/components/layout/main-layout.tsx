"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/logo"; // Asegúrate de que este componente use tus assets limpios
import { useWalletBalance } from "@/lib/useWalletBalance";
import { 
  LayoutGrid, Gamepad2, Gift, Users, UserCircle, 
  Wallet, Menu, X, LogOut, ChevronRight, Headphones 
} from "lucide-react";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { formatted, loading } = useWalletBalance();

  const menuItems = [
    { href: "/lobby", label: "Casino", icon: LayoutGrid },
    { href: "/games/crash", label: "Originals", icon: Gamepad2 },
    { href: "/promos", label: "Promociones", icon: Gift },
    { href: "/affiliates", label: "Afiliados", icon: Users },
    { href: "/profile", label: "Mi Cuenta", icon: UserCircle },
  ];

  return (
    <div className="flex min-h-screen bg-[#0a0a0b] text-white">
      
      {/* SIDEBAR DESKTOP & MOBILE */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[#121214] border-r border-white/5 transition-transform duration-300
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static flex flex-col
      `}>
        {/* Logo Area */}
        <div className="h-20 flex items-center px-6 border-b border-white/5">
           <Link href="/lobby" className="flex items-center gap-2">
             {/* Ajusta el tamaño según tu asset real */}
             <Logo variant="full" size={120} className="object-contain" /> 
           </Link>
           <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-auto text-zinc-400">
             <X size={24} />
           </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                  ${isActive 
                    ? "bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)]" 
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"}
                `}
              >
                <item.icon size={18} className={isActive ? "text-[#00F0FF]" : ""} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer Sidebar */}
        <div className="p-4 border-t border-white/5 space-y-2">
           <Link href="/support" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-zinc-400 hover:text-white transition-colors">
              <Headphones size={18} /> Soporte 24/7
           </Link>
           <div className="text-[10px] text-zinc-600 px-4 pt-2">
             v1.0.0 • Chido Casino
           </div>
        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0a0a0b]">
        
        {/* HEADER */}
        <header className="h-16 sticky top-0 z-40 glass-panel border-b-0 border-white/5 px-4 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-white">
              <Menu size={24} />
            </button>
            {/* Breadcrumb o Título Dinámico opcional */}
          </div>

          <div className="flex items-center gap-4">
            <Link href="/wallet" className="group flex items-center gap-3 bg-[#1A1A1D] hover:bg-[#222] border border-white/10 rounded-full px-1 pl-4 py-1 transition-all cursor-pointer">
               <div className="flex flex-col items-end leading-none mr-1">
                 <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Saldo</span>
                 <span className="text-sm font-bold tabular-nums text-white">
                   ${loading ? "..." : formatted}
                 </span>
               </div>
               <div className="h-8 w-8 rounded-full bg-[#00F0FF] text-black flex items-center justify-center font-bold">
                 <Wallet size={16} />
               </div>
            </Link>
            
            <Link href="/profile" className="hidden sm:block">
              <div className="h-9 w-9 rounded-full bg-zinc-800 border border-white/10 overflow-hidden">
                 {/* Avatar placeholder profesional */}
                 <div className="w-full h-full bg-gradient-to-tr from-purple-500 to-blue-500" />
              </div>
            </Link>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
           <div className="max-w-7xl mx-auto">
             {children}
           </div>
        </main>
      </div>
    </div>
  );
}
