import Image from "next/image";
import { cn } from "@/lib/cn";

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  variant?: "default" | "giant" | "taco" | "iso-color" | "iso-bw";
}

export function Logo({ className, size = 45, showText = false, variant = "default" }: LogoProps) {
  const finalSize = variant === "giant" ? 140 : size;
  
  let imageSrc = "/chido-logo.png";
  if (variant === "taco") imageSrc = "/taco-slot.png";
  if (variant === "iso-color") imageSrc = "/isotipo-color.png";
  if (variant === "iso-bw") imageSrc = "/isotipo-bw.png";
  if (variant === "giant") imageSrc = "/icon-512.png"; 

  return (
    <div className={cn("flex items-center gap-4 select-none", className)}>
      <div 
        className={cn(
          "relative transition-transform duration-500 hover:scale-110 cursor-pointer",
          variant === "giant" && "animate-float drop-shadow-[0_0_35px_rgba(0,240,255,0.4)]",
          variant === "taco" && "drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]"
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
