import Image from "next/image";
import { cn } from "@/lib/cn";

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export function Logo({ className, size = 40, showText = false }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3 select-none", className)}>
      <div 
        className="relative overflow-hidden rounded-xl shadow-[0_0_15px_rgba(0,240,255,0.2)] border border-white/10 group cursor-pointer transition-transform hover:scale-105"
        style={{ width: size, height: size }}
      >
        {/* Asegúrate de tener chido-logo.png en public/ */}
        <Image 
          src="/chido-logo.png" 
          alt="Chido Casino" 
          fill
          className="object-cover"
        />
        {/* Brillo interno al hacer hover */}
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      
      {showText && (
        <div className="flex flex-col leading-none">
          <span className="font-black text-lg text-white tracking-tighter drop-shadow-md">
            CHIDO
          </span>
          <span className="text-[10px] font-bold text-chido-cyan tracking-[0.2em] uppercase">
            CASINO
          </span>
        </div>
      )}
    </div>
  );
}