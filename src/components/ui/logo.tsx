import Image from "next/image";
import { cn } from "@/lib/cn";

interface LogoProps {
  className?: string;
  size?: number;
  // Variantes estrictas según tus archivos
  variant?: "default" | "giant" | "taco" | "iso-color" | "iso-bw" | "text-only";
}

export function Logo({ className, size = 45, variant = "default" }: LogoProps) {
  // Ajuste de tamaño para variantes grandes
  const finalSize = variant === "giant" ? 160 : size;
  
  // Mapeo de archivos (Asegúrate que estos existan en /public)
  let imageSrc = "/chido-logo.png"; // Logo oficial cuadrado por defecto
  
  if (variant === "taco") imageSrc = "/taco-slot.png";
  if (variant === "iso-color") imageSrc = "/isotipo-color.png";
  if (variant === "iso-bw") imageSrc = "/isotipo-bw.png";
  if (variant === "giant") imageSrc = "/icon-512.png"; // Usamos la máxima resolución para login

  // Si la variante es SOLO TEXTO (para casos muy específicos donde no cabe imagen)
  if (variant === "text-only") {
    return (
      <div className={cn("flex flex-col leading-none select-none", className)}>
        <span className="font-black text-white tracking-tighter text-2xl">CHIDO</span>
        <span className="text-[10px] font-bold text-chido-cyan tracking-[0.4em] uppercase">CASINO</span>
      </div>
    );
  }

  // Comportamiento por defecto: SOLO IMAGEN (Respetando tu regla de oro)
  return (
    <div 
      className={cn(
        "relative transition-transform duration-500 hover:scale-110 cursor-pointer select-none",
        // Efectos especiales por variante
        variant === "giant" && "animate-float drop-shadow-[0_0_35px_rgba(0,240,255,0.4)]",
        variant === "taco" && "drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]",
        className
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
  );
}
