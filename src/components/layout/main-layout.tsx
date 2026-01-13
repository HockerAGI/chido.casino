"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { useWalletBalance } from "@/lib/useWalletBalance";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { 
  Home, Wallet, Users, Menu, X, LogOut, 
  Bell, Search, Zap, Gift, Globe, MessageCircleHeart, Trophy
} from "lucide-react";

// Navegación Comercial
const routes = [
  { href: "/lobby", label: "Lobby", icon: Home },
  { href: "/games/crash", label: "Crash", icon: Zap },
  { href: "/promos", label: "Promociones", icon: Gift },
  { href: "/wallet", label: "Bóveda", icon: Wallet }, // Bóveda suena más seguro/premium
  { href: "/affiliates", label: "Afiliados", icon: Users },
  { href: "/tournaments", label: "Torneos", icon: Trophy },
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
    <div className="min-h-screen bg-mexican-pattern bg-fixed text-white font-sans flex flex-col lg:flex-row">
      
      {/* HEADER MÓVIL */}
      <header className="lg:hidden fixed top-0 w-full z-50 bg-chido-bg/95 backdrop-blur-xl border-b border-white/5 px-4 h-16 flex items-center justify-between shadow-lg">
        <Logo size={42} />
        <div className="flex items-center gap-3">
            <Link href="/wallet" className="bg-zinc-800/50 border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-2 active:scale-95 transition-transform">
               <span className="text-[10px] text-zinc-400 font-medium">MXN</span>
               <span className="text-xs font-bold text-chido-green tabular-nums">
                 ${loading ? "..." : formatted}
               </span>
            </Link>
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 text-white">
              {isSidebarOpen ? <X size={26} /> : <Menu size={26} />}
            </button>
        </div>
      </header>

      {/* SIDEBAR */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-[#08080a] border-r border-white/5 transform transition-transform duration-300 ease-out
        lg:translate-x-0 lg:static lg:block shadow-2xl
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="h-full flex flex-col">
          <div className="h-24 hidden lg:flex items-center px-8 border-b border-white/5 bg-black/20">
             <Logo size={55} showText={true} /> 
          </div>

          <div className="lg:hidden p-6 mt-16 bg-gradient-to-r from-zinc-900 to-black border-b border-white/5">
            <div className="text-xs text-zinc-400 uppercase mb-1">Tu Saldo Disponible</div>
            <div className="text-3xl font-black text-white tabular-nums">${loading ? "..." : formatted}</div>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto scrollbar-hide">
            {routes.map((route) => {
              const Icon = route.icon;
              const isActive = pathname === route.href;
              return (
                <Link 
                  key={route.href} 
                  href={route.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group relative overflow-hidden
                    ${isActive ? "bg-white/10 text-white shadow-lg" : "text-zinc-400 hover:bg-white/5 hover:text-white"}
                  `}
                >
                  {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-chido-pink shadow-[0_0_10px_#FF0099]" />}
                  <Icon size={20} className={isActive ? "text-chido-pink" : "text-zinc-500 group-hover:text-white"} />
                  <span className="font-semibold tracking-tight">{route.label}</span>
                </Link>
              );
            })}

            <div className="my-6 border-t border-white/5 mx-4" />
            
            {/* AGIs Integration: NOVA ASSIST */}
            <div className="px-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Ayuda Inteligente</div>
            <button className="w-full flex items-center gap-4 px-4 py-3 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all group">
               <div className="relative">
                 <MessageCircleHeart size={20} className="group-hover:text-chido-cyan transition-colors" />
                 <span className="absolute -top-1 -right-1 w-2 h-2 bg-chido-green rounded-full animate-pulse"></span>
               </div>
               <div className="flex flex-col items-start leading-none gap-1">
                 <span className="font-semibold text-sm">NOVA Assist</span>
                 <span className="text-[9px] text-zinc-600 group-hover:text-zinc-400">Siempre en línea</span>
               </div>
            </button>
          </nav>

          <div className="p-6 border-t border-white/5 bg-black/40">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-chido-red/80 hover:bg-chido-red/10 hover:text-chido-red transition-all font-bold text-sm">
              <LogOut size={18} /> Salir
            </button>
          </div>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto relative scrollbar-hide bg-chido-bg pt-16 lg:pt-0">
        
        {/* HEADER DESKTOP */}
        <div className="hidden lg:flex items-center justify-between px-8 py-4 sticky top-0 z-30 bg-chido-bg/90 backdrop-blur-md border-b border-white/5">
           <div className="flex items-center gap-4">
             <div className="relative group">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-chido-cyan transition-colors" size={16} />
               <input 
                 type="text" 
                 placeholder="Buscar..." 
                 className="bg-zinc-900 border border-white/5 rounded-full pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-chido-pink/50 w-64 transition-all focus:w-80"
               />
             </div>
             <button className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white bg-zinc-900 px-3 py-2 rounded-full border border-white/5">
                <Globe size={14} /> ES-MX
             </button>
           </div>

           <div className="flex items-center gap-4">
             {/* Call to Action Principal */}
             <Link href="/wallet?deposit=1" className="bg-gradient-to-r from-chido-green to-emerald-600 text-black px-6 py-2 rounded-full font-black text-sm hover:scale-105 transition-transform shadow-[0_0_15px_rgba(50,205,50,0.3)] flex items-center gap-2">
               <Wallet size={16} /> DEPOSITAR
             </Link>
             
             <div className="flex flex-col items-end leading-none">
                <span className="text-[10px] text-zinc-500 font-bold uppercase">Saldo Real</span>
                <span className="text-lg font-black text-white tabular-nums">${loading ? "..." : formatted}</span>
             </div>

             <div className="h-8 w-[1px] bg-white/10 mx-2" />
             
             <button className="relative p-2 hover:bg-white/5 rounded-full">
               <Bell size={20} className="text-zinc-400" />
               <span className="absolute top-2 right-2 w-2 h-2 bg-chido-pink rounded-full animate-pulse" />
             </button>
             
             <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-chido-cyan to-chido-pink p-[2px] cursor-pointer">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${formatted}`} alt="Avatar" className="w-full h-full rounded-full bg-black" />
             </div>
           </div>
        </div>

        <div className="p-4 lg:p-8 pb-32 lg:pb-12 max-w-[1600px] mx-auto min-h-full">
          {children}
        </div>
      </main>

      {/* NAV MÓVIL INFERIOR */}
      <nav className="lg:hidden fixed bottom-0 w-full bg-[#0c0c0e]/95 backdrop-blur-2xl border-t border-white/5 pb-safe z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.8)]">
        <div className="flex justify-around items-center h-[70px]">
          <Link href="/lobby" className={`flex flex-col items-center gap-1 ${pathname === '/lobby' ? 'text-chido-pink' : 'text-zinc-500'}`}>
            <Home size={22} />
            <span className="text-[10px] font-bold">Lobby</span>
          </Link>
          <Link href="/games/crash" className={`flex flex-col items-center gap-1 ${pathname.includes('crash') ? 'text-chido-cyan' : 'text-zinc-500'}`}>
            <Zap size={22} />
            <span className="text-[10px] font-bold">Crash</span>
          </Link>
          
          <Link href="/wallet?deposit=1" className="-mt-8">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-chido-cyan to-chido-pink p-[3px] shadow-[0_0_20px_rgba(255,0,153,0.4)] animate-pulse-slow">
              <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                 <Wallet size={28} className="text-white" />
              </div>
            </div>
          </Link>

          <Link href="/promos" className={`flex flex-col items-center gap-1 ${pathname === '/promos' ? 'text-chido-gold' : 'text-zinc-500'}`}>
            <Gift size={22} />
            <span className="text-[10px] font-bold">Bonos</span>
          </Link>
          {/* NOVA en Móvil */}
          <Link href="/chat" className="flex flex-col items-center gap-1 text-zinc-500">
            <MessageCircleHeart size={22} />
            <span className="text-[10px] font-bold">NOVA</span>
          </Link>
        </div>
      </nav>

    </div>
  );
}
