import Image from "next/image";
import { cn } from "@/lib/cn";

interface LogoProps {
  className?: string;
  size?: number;
  // full: Logo oficial (Texto + Isotipo) -> chido-logo.png
  // iso-color: Isotipo color (Iconos, botones) -> isotipo-color.png
  // iso-bw: Isotipo blanco y negro (Footer) -> isotipo-bw.png
  variant?: "full" | "iso-color" | "iso-bw";
}

export function Logo({ className, size = 45, variant = "iso-color" }: LogoProps) {
  // Ajuste de tamaño: Si es 'full', necesitamos más ancho proporcional
  const width = variant === "full" ? size * 2.5 : size;
  const height = size;

  let imageSrc = "/isotipo-color.png"; // Default
  
  if (variant === "full") imageSrc = "/chido-logo.png";
  if (variant === "iso-color") imageSrc = "/isotipo-color.png";
  if (variant === "iso-bw") imageSrc = "/isotipo-bw.png";

  return (
    <div 
      className={cn("relative select-none transition-transform duration-300 hover:scale-105", className)}
      style={{ width, height }}
    >
      <Image 
        src={imageSrc} 
        alt="Chido Casino" 
        fill
        className={cn(
          "object-contain",
          // Efectos específicos por variante
          variant === "iso-color" && "drop-shadow-[0_0_15px_rgba(255,0,153,0.3)]",
          variant === "full" && "drop-shadow-xl"
        )}
        priority
      />
    </div>
  );
}