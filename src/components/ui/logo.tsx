import Image from "next/image";
import { cn } from "@/lib/cn";

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  variant?: "default" | "giant" | "taco"; // Nueva variante Taco
}

export function Logo({ className, size = 45, showText = false, variant = "default" }: LogoProps) {
  const finalSize = variant === "giant" ? 140 : size;
  const imageSrc = variant === "taco" ? "/taco-slot.png" : "/chido-logo.png"; // Asegúrate de subir taco-slot.png

  return (
    <div className={cn("flex items-center gap-3 select-none", className)}>
      <div 
        className={cn(
          "relative transition-transform duration-500 hover:scale-110 cursor-pointer",
          variant === "giant" && "animate-float drop-shadow-[0_0_35px_rgba(0,240,255,0.4)]"
        )}
        style={{ width: finalSize, height: finalSize }}
      >
        <Image 
          src={imageSrc} 
          alt="Chido Casino" 
          fill
          className="object-contain"
          priority
        />
      </div>
      
      {showText && (
        <div className="flex flex-col justify-center leading-none">
          <span className={cn(
            "font-black text-white tracking-tighter",
            variant === "giant" ? "text-5xl drop-shadow-xl" : "text-xl"
          )}>
            CHIDO
          </span>
          {variant === "giant" && (
            <span className="text-lg font-bold text-chido-cyan tracking-[0.4em] uppercase mt-1">
              CASINO
            </span>
          )}
        </div>
      )}
    </div>
  );
}
