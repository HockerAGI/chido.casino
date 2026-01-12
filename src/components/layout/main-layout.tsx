"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { useWalletBalance } from "@/lib/useWalletBalance";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { 
  Home, 
  Wallet, 
  Gamepad2, 
  Users, 
  Menu, 
  X, 
  LogOut,
  Bell,
  Search,
  Zap
} from "lucide-react";

const routes = [
  { href: "/lobby", label: "Lobby", icon: Home },
  { href: "/games/crash", label: "Crash", icon: Zap }, // Acceso directo al juego estrella
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/affiliates", label: "Socios", icon: Users },
];

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClientComponentClient();
  const { formatted, loading } = useWalletBalance();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-chido-cyan/30 flex flex-col lg:flex-row">
      
      {/* === MOBILE TOP BAR === */}
      <header className="lg:hidden fixed top-0 w-full z-50 bg-zinc-950/90 backdrop-blur-xl border-b border-white/5 px-4 h-16 flex items-center justify-between transition-all duration-300">
        <Logo size={36} />
        
        <div className="flex items-center gap-3">
            <Link href="/wallet" className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-2 active:scale-95 transition-transform">
               <span className="text-[10px] text-zinc-400 font-medium">MXN</span>
               <span className="text-xs font-bold text-chido-cyan tabular-nums">
                 ${loading ? "..." : formatted}
               </span>
            </Link>
            
            <button 
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-white/5 text-zinc-300 active:text-white"
            >
              {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
        </div>
      </header>

      {/* === SIDEBAR / DRAWER === */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-[#0c0c0e] border-r border-white/5 transform transition-transform duration-300 ease-out
        lg:translate-x-0 lg:static lg:block
        ${isSidebarOpen ? "translate-x-0 shadow-2xl shadow-black" : "-translate-x-full"}
      `}>
        <div className="h-full flex flex-col">
          {/* Logo Desktop */}
          <div className="h-24 hidden lg:flex items-center px-8 border-b border-white/5">
             <Logo size={48} showText={true} /> 
          </div>

          {/* User Info Mobile */}
          <div className="lg:hidden p-6 border-b border-white/5 bg-white/[0.02] mt-16">
            <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Tu Saldo</div>
            <div className="text-2xl font-black text-white tabular-nums">${loading ? "..." : formatted}</div>
          </div>

          {/* Navegación */}
          <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto scrollbar-hide">
            <div className="px-4 mb-2 text-[10px] font-black text-zinc-600 uppercase tracking-widest">Plataforma</div>
            {routes.map((route) => {
              const Icon = route.icon;
              const isActive = pathname === route.href;
              return (
                <Link 
                  key={route.href} 
                  href={route.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group relative overflow-hidden
                    ${isActive 
                      ? "bg-white/10 text-white shadow-[0_0_20px_rgba(0,0,0,0.5)]" 
                      : "text-zinc-400 hover:bg-white/5 hover:text-white"
                    }
                  `}
                >
                  {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-chido-cyan shadow-[0_0_10px_#00F0FF]" />}
                  <Icon size={20} className={isActive ? "text-chido-cyan" : "text-zinc-500 group-hover:text-white"} />
                  <span className="font-semibold tracking-tight">{route.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer Sidebar */}
          <div className="p-6 border-t border-white/5 bg-black/20">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-chido-red/80 hover:bg-chido-red/10 hover:text-chido-red transition-all font-bold text-sm"
            >
              <LogOut size={18} />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </aside>

      {/* === CONTENT AREA === */}
      <main className="flex-1 overflow-y-auto relative scrollbar-hide bg-zinc-950 pt-16 lg:pt-0">
        {/* Desktop Header */}
        <div className="hidden lg:flex items-center justify-between px-8 py-5 sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-md border-b border-white/5">
           <div className="relative group">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-chido-cyan transition-colors" size={16} />
             <input 
               type="text" 
               placeholder="Buscar juegos..." 
               className="bg-zinc-900 border border-white/5 rounded-full pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-chido-cyan/50 w-64 transition-all focus:w-80"
             />
           </div>
           <div className="flex items-center gap-4">
             <Link href="/wallet?deposit=1" className="bg-chido-green text-black px-6 py-2 rounded-full font-black text-sm hover:brightness-110 transition shadow-[0_0_15px_rgba(50,205,50,0.4)] hover:scale-105 active:scale-95">
               DEPOSITAR
             </Link>
             <div className="h-10 w-px bg-white/10 mx-2" />
             <div className="text-right">
                <div className="text-[10px] text-zinc-500 font-bold uppercase">Saldo Real</div>
                <div className="text-sm font-black text-white tabular-nums">${loading ? "..." : formatted}</div>
             </div>
           </div>
        </div>

        <div className="p-4 lg:p-8 pb-32 lg:pb-12 max-w-[1600px] mx-auto min-h-full">
          {children}
        </div>
      </main>

      {/* === MOBILE BOTTOM NAV === */}
      <nav className="lg:hidden fixed bottom-0 w-full bg-[#0c0c0e]/95 backdrop-blur-2xl border-t border-white/5 pb-safe z-40">
        <div className="flex justify-around items-center h-[70px]">
          {routes.map((route) => {
            const Icon = route.icon;
            const isActive = pathname === route.href;
            return (
              <Link 
                key={route.href} 
                href={route.href}
                className={`relative flex flex-col items-center gap-1.5 p-2 rounded-lg transition-colors w-16
                  ${isActive ? "text-white" : "text-zinc-600"}
                `}
              >
                {isActive && <div className="absolute -top-[1px] w-8 h-[2px] bg-chido-cyan shadow-[0_0_10px_#00F0FF]" />}
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "drop-shadow-[0_0_5px_rgba(0,240,255,0.8)]" : ""} />
                <span className="text-[9px] font-bold uppercase tracking-wide">{route.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

    </div>
  );
}