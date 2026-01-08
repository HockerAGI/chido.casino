// src/app/(auth)/layout.tsx
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell">
      {/* Fondo premium (glow + grain via CSS) */}
      <div className="auth-bg" aria-hidden="true" />

      <main className="auth-main">
        <section className="auth-card fade-up subtle-float">
          {/* Logo centrado */}
          <div className="auth-brand">
            <Link href="/" className="inline-flex items-center justify-center">
              <Image
                src="/chido-logo.png"
                alt="Chido Casino"
                width={160}
                height={160}
                priority
                className="auth-logo"
              />
            </Link>
            <p className="auth-tagline">
              Acceso seguro • Wallet listo • Depósitos con acreditación automática
            </p>
          </div>

          {children}

          <div className="auth-footer">
            <p className="text-white/45 text-xs">
              Al continuar aceptas los Términos, Privacidad y reglas de juego responsable.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}