// src/app/(auth)/layout.tsx
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#06070b] text-white">
      {/* FX Layers */}
      <div className="pointer-events-none absolute inset-0">
        <div className="ambient-glow" />
        <div className="ambient-glow ambient-glow--two" />
        <div className="ambient-glow ambient-glow--three" />
        <div className="vignette" />
        <div className="grain-overlay" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-[100dvh] items-center justify-center px-4 py-10">
        {children}
      </div>
    </div>
  );
}