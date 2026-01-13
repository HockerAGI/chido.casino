import Image from "next/image";
import { cn } from "@/lib/cn";

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  // Nuevas variantes alineadas a tus archivos
  variant?: "default" | "giant" | "iso-color" | "iso-bw" | "app-icon";
}

export function Logo({ className, size = 45, showText = false, variant = "default" }: LogoProps) {
  // Ajuste de tamaño automático para variantes grandes
  const finalSize = variant === "giant" ? 140 : size;

  // Lógica de selección de imagen
  let imageSrc = "/chido-logo.png"; // Default (Logo Oficial Completo)

  if (variant === "iso-color") imageSrc = "/isotipo-color.png";
  if (variant === "iso-bw") imageSrc = "/isotipo-bw.png";
  if (variant === "app-icon") imageSrc = "/icon-512.png";
  
  // Si es gigante (Login), usamos el de App Icon que suele tener mejor resolución/cuadrado
  // o mantenemos el chido-logo si prefieres el texto integrado.
  if (variant === "giant") imageSrc = "/icon-512.png"; 

  return (
    <div className={cn("flex items-center gap-3 select-none", className)}>
      <div 
        className={cn(
          "relative transition-transform duration-500 hover:scale-110 cursor-pointer",
          // Efectos especiales según variante
          variant === "giant" && "animate-float drop-shadow-[0_0_35px_rgba(0,240,255,0.4)]",
          variant === "iso-bw" && "opacity-50 hover:opacity-100 hover:grayscale-0 grayscale transition-all",
          variant === "iso-color" && "drop-shadow-[0_0_15px_rgba(255,0,153,0.3)]"
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
