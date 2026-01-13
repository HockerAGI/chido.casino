import Image from "next/image";
import { cn } from "@/lib/cn";

interface LogoProps {
  className?: string;
  size?: number; // Tamaño base
  showText?: boolean;
  variant?: "default" | "giant"; // Nueva variante para Login
}

export function Logo({ className, size = 50, showText = false, variant = "default" }: LogoProps) {
  const finalSize = variant === "giant" ? 120 : size;

  return (
    <div className={cn("flex items-center gap-4 select-none", className)}>
      <div 
        className={cn(
          "relative overflow-hidden rounded-2xl shadow-[0_0_25px_rgba(0,240,255,0.3)] border border-white/10 group transition-transform hover:scale-105",
          variant === "giant" && "shadow-[0_0_50px_rgba(255,0,153,0.4)]"
        )}
        style={{ width: finalSize, height: finalSize }}
      >
        <Image 
          src="/chido-logo.png" 
          alt="Chido Casino" 
          fill
          className="object-cover"
          priority
        />
        {/* Efecto de brillo "Glossy" */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-50" />
      </div>
      
      {showText && (
        <div className="flex flex-col leading-none justify-center">
          <span className={cn(
            "font-black text-white tracking-tighter drop-shadow-md",
            variant === "giant" ? "text-5xl" : "text-2xl"
          )}>
            CHIDO
          </span>
          <span className={cn(
            "font-bold text-chido-cyan tracking-[0.3em] uppercase",
            variant === "giant" ? "text-lg text-chido-pink" : "text-[10px]"
          )}>
            CASINO
          </span>
        </div>
      )}
    </div>
  );
}
