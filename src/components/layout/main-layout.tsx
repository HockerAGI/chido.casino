      {/* BARRA INFERIOR MÓVIL (MEJORADA) */}
      <nav className="lg:hidden fixed bottom-0 w-full bg-[#050510]/90 backdrop-blur-xl border-t border-white/10 pb-safe z-50">
        <div className="flex justify-around items-end h-[85px] pb-4 px-2 relative">
          
          <Link href="/lobby" className={`flex flex-col items-center gap-1.5 transition-colors ${pathname === '/lobby' ? 'text-chido-cyan' : 'text-zinc-500'}`}>
            <Home size={24} strokeWidth={pathname === '/lobby' ? 2.5 : 2}/>
            <span className="text-[10px] font-bold">Lobby</span>
          </Link>
          
          <Link href="/games/crash" className={`flex flex-col items-center gap-1.5 transition-colors ${pathname.includes('crash') ? 'text-chido-pink' : 'text-zinc-500'}`}>
            <Zap size={24} />
            <span className="text-[10px] font-bold">Crash</span>
          </Link>
          
          {/* BOTÓN CENTRAL "TACO POP" */}
          <div className="relative -top-5">
             <Link href="/wallet?deposit=1">
                <div className="w-20 h-20 rounded-full bg-gradient-to-b from-[#050510] to-zinc-900 border-4 border-[#050510] flex items-center justify-center shadow-[0_-5px_20px_rgba(0,240,255,0.3)] transform transition-transform active:scale-95">
                   <div className="absolute inset-0 rounded-full bg-chido-cyan/20 animate-pulse-slow blur-xl" />
                   {/* Logo Isotipo Color Grande */}
                   <Logo variant="iso-color" size={75} className="drop-shadow-2xl relative z-10" />
                </div>
             </Link>
          </div>

          <Link href="/promos" className={`flex flex-col items-center gap-1.5 transition-colors ${pathname === '/promos' ? 'text-chido-gold' : 'text-zinc-500'}`}>
            <Gift size={24} />
            <span className="text-[10px] font-bold">Bonos</span>
          </Link>
          
          <Link href="/profile" className={`flex flex-col items-center gap-1.5 transition-colors ${pathname === '/profile' ? 'text-white' : 'text-zinc-500'}`}>
            <User size={24} />
            <span className="text-[10px] font-bold">Perfil</span>
          </Link>
        </div>
      </nav>
