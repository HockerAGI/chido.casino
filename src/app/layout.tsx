import type { Metadata } from "next";
import "./globals.css";
import PWARegister from "./_components/PWARegister";
import AppShell from "./_components/AppShell";

function resolveMetadataBase() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL; // ej: https://chido.casino
  if (explicit) return new URL(explicit);

  const vercel = process.env.VERCEL_URL; // ej: chidocasino-xxxxx.vercel.app (sin protocolo)
  if (vercel) return new URL(`https://${vercel}`);

  return new URL("https://chido.casino");
}

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  title: "Chido Casino",
  description: "Casino online con juegos originales, bonos y retiros rápidos.",
  openGraph: {
    title: "Chido Casino",
    description: "Juega originals. Reclama tu bono. Retira rápido.",
    images: ["/opengraph-image.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Chido Casino",
    description: "Juega originals. Reclama tu bono. Retira rápido.",
    images: ["/opengraph-image.jpg"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-black text-white">
        <PWARegister />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}