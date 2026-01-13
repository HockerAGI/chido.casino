"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { useWalletBalance } from "@/lib/useWalletBalance";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { 
  Home, Wallet, Menu, X, LogOut, Bell, Search, 
  Zap, Gift, Trophy, User, Settings, ShieldCheck, ChevronRight
} from "lucide-react";

const routes = [
  { href: "/lobby", label: "Lobby", icon: Home },
  { href: "/games/crash", label: "Crash", icon: Zap },
  { href: "/promos", label: "Bonos", icon: Gift },
  { href: "/affiliates", label: "Socios", icon: Users },
  { href: "/profile", label: "Mi Perfil", icon: User }, // Nueva sección completa
];

import { Users } from "lucide-react"; // Fix import

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClientComponentClient();
  const { formatted, loading } = useWalletBalance();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[#050510] bg-mexican-pattern bg-fixed text-white font-sans flex flex-col lg:flex-row overflow-x-hidden selection:bg-chido-pink/30">
      
      {/* HEADER MÓVIL */}
      <header className="lg:hidden fixed top-0 w-full z-50 bg-[#050510]/95 backdrop-blur-xl border-b border-white/5 px-4 h-16 flex items-center justify-between shadow-2xl transition-all">
        <Logo size={40} /> {/* Solo Logo Imagen */}
        
        <div className="flex items-center gap-3">
            <Link href="/wallet" className="bg-zinc-900/80 border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-2 active:scale-95 transition-transform">
               <span className="text-[10px] text-zinc-400 font-bold uppercase">Saldo</span>
               <span className="text-xs font-black text-chido-green tabular-nums">
                 ${loading ? "..." : formatted}
               </span>
            </Link>
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 text-white active:scale-90 transition-transform">
              {isSidebarOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
        </div>
      </header>

      {/* SIDEBAR / MENÚ LATERAL */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-80 bg-[#08080a] border-r border-white/5 transform transition-transform duration-300 ease-out
        lg:translate-x-0 lg:static lg:block shadow-[10px_0_40px_rgba(0,0,0,0.5)]
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="h-full flex flex-col">
          <div className="h-24 hidden lg:flex items-center justify-center border-b border-white/5 bg-black/20">
             <Logo size={50} showText={true} /> 
          </div>

          {/* PERFIL RESUMEN (Estilo Afun) */}
          <div className="p-6 mt-16 lg:mt-0 bg-gradient-to-br from-zinc-900 via-black to-black border-b border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-chido-pink/10 blur-2xl rounded-full group-hover:bg-chido-pink/20 transition-colors" />
            <Link href="/profile" className="relative z-10 flex items-center gap-4 mb-4">
               <div className="w-12 h-12 rounded-full border-2 border-chido-cyan p-[2px]">
                 <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${formatted}`} className="w-full h-full rounded-full bg-zinc-800" alt="Avatar"/>
               </div>
               <div>
                 <div className="text-xs font-bold text-zinc-400 uppercase">Nivel Actual</div>
                 <div className="text-base font-black text-white flex items-center gap-1">
                   Salsa Verde <ShieldCheck size={14} className="text-chido-green"/>
                 </div>
               </div>
               <ChevronRight className="ml-auto text-zinc-600" size={16} />
            </Link>
            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
               <div className="h-full w-[35%] bg-gradient-to-r from-chido-cyan to-chido-pink rounded-full animate-pulse-slow" />
            </div>
            <div className="flex justify-between text-[10px] font-bold text-zinc-500 mt-1 uppercase">
               <span>0 XP</span>
               <span>500 XP (Serrano)</span>
            </div>
          </div>

          {/* NAV LINKS */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto scrollbar-hide">
            {routes.map((route) => {
              const Icon = route.icon;
              const isActive = pathname === route.href;
              return (
                <Link 
                  key={route.href} 
                  href={route.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 group relative overflow-hidden
                    ${isActive ? "bg-white/10 text-white shadow-lg" : "text-zinc-400 hover:bg-white/5 hover:text-white"}
                  `}
                >
                  {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-chido-cyan shadow-[0_0_15px_#00F0FF]" />}
                  <Icon size={20} className={isActive ? "text-chido-cyan" : "text-zinc-500 group-hover:text-white transition-colors"} />
                  <span className="font-bold tracking-tight">{route.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-6 border-t border-white/5 bg-black/40">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-chido-red/80 hover:bg-chido-red/10 hover:text-chido-red transition-all font-bold text-sm bg-chido-red/5">
              <LogOut size={18} /> Cerrar Sesión
            </button>
          </div>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto relative scrollbar-hide pt-16 lg:pt-0">
        
        {/* TOP BAR DESKTOP */}
        <div className="hidden lg:flex items-center justify-between px-8 py-5 sticky top-0 z-30 bg-[#050510]/80 backdrop-blur-xl border-b border-white/5">
           <div className="flex items-center gap-6">
             {/* Buscador */}
             <div className="relative group w-80">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-chido-cyan transition-colors" size={18} />
               <input 
                 type="text" 
                 placeholder="Busca juegos, proveedores..." 
                 className="w-full bg-zinc-900/50 border border-white/5 rounded-full pl-12 pr-4 py-2.5 text-sm text-white focus:border-chido-cyan/50 focus:bg-zinc-900 transition-all outline-none"
               />
             </div>
           </div>

           <div className="flex items-center gap-6">
             <Link href="/wallet?deposit=1" className="bg-gradient-to-r from-chido-green to-emerald-600 text-black px-6 py-2.5 rounded-full font-black text-sm hover:scale-105 transition-transform shadow-[0_0_20px_rgba(50,205,50,0.4)] flex items-center gap-2 animate-fade-in">
               <Wallet size={18} /> DEPOSITAR
             </Link>
             
             <div className="flex flex-col items-end leading-none">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Saldo Real</span>
                <span className="text-xl font-black text-white tabular-nums">${loading ? "..." : formatted}</span>
             </div>
             
             <div className="w-10 h-10 rounded-full border border-white/10 p-1 cursor-pointer hover:border-chido-pink transition-colors relative">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${formatted}`} alt="Avatar" className="rounded-full bg-zinc-800" />
                <span className="absolute top-0 right-0 w-3 h-3 bg-chido-green rounded-full border-2 border-[#050510]" />
             </div>
           </div>
        </div>

        <div className="p-4 lg:p-8 pb-32 lg:pb-12 max-w-[1600px] mx-auto min-h-full">
          {children}
        </div>
      </main>

      {/* BARRA INFERIOR MÓVIL (Con Taco Slot Isotipo) */}
      <nav className="lg:hidden fixed bottom-0 w-full bg-[#050510]/90 backdrop-blur-2xl border-t border-white/5 pb-safe z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.9)]">
        <div className="flex justify-around items-center h-[75px]">
          <Link href="/lobby" className={`flex flex-col items-center gap-1 ${pathname === '/lobby' ? 'text-chido-cyan' : 'text-zinc-600'}`}>
            <Home size={22} strokeWidth={pathname === '/lobby' ? 2.5 : 2}/>
            <span className="text-[9px] font-bold">Lobby</span>
          </Link>
          <Link href="/games/crash" className={`flex flex-col items-center gap-1 ${pathname.includes('crash') ? 'text-chido-pink' : 'text-zinc-600'}`}>
            <Zap size={22} />
            <span className="text-[9px] font-bold">Crash</span>
          </Link>
          
          {/* TACO SLOT CENTRAL */}
          <Link href="/wallet?deposit=1" className="-mt-10 group">
             <div className="relative w-16 h-16 transition-transform group-active:scale-95">
               <div className="absolute inset-0 bg-chido-cyan/20 rounded-full blur-xl animate-pulse-slow" />
               <Logo variant="taco" size={64} className="drop-shadow-2xl" />
             </div>
          </Link>

          <Link href="/promos" className={`flex flex-col items-center gap-1 ${pathname === '/promos' ? 'text-chido-gold' : 'text-zinc-600'}`}>
            <Gift size={22} />
            <span className="text-[9px] font-bold">Bonos</span>
          </Link>
          <Link href="/profile" className={`flex flex-col items-center gap-1 ${pathname === '/profile' ? 'text-white' : 'text-zinc-600'}`}>
            <User size={22} />
            <span className="text-[9px] font-bold">Perfil</span>
          </Link>
        </div>
      </nav>

    </div>
  );
}
