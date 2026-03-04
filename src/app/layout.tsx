import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppShell from "./_components/AppShell";
import PWARegister from "./_components/PWARegister";
import { Toaster } from "@/components/ui/toaster";
import { ToastProvider } from "@/components/ui/use-toast";

// CHIDO usa Auth/Supabase (cookies) y múltiples páginas client-side.
// Forzamos rendering dinámico para evitar prerender estático que rompe en build.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://chido.casino"),
  title: { default: "Chido Casino", template: "%s • Chido Casino" },
  description: "Plataforma de entretenimiento con wallet, promos y juegos originales.",
  applicationName: "CHIDO",
  manifest: "/manifest.json",
  icons: { icon: [{ url: "/icon-192.png" }, { url: "/icon-512.png" }] },
  openGraph: {
    title: "Chido Casino",
    description: "Juega chido. Controla tu bóveda. Bonos y promos reales.",
    url: "/",
    siteName: "Chido Casino",
    images: [{ url: "/opengraph-image.jpg" }],
    locale: "es_MX",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0D10",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[#050510] text-white selection:bg-chido-pink/30">
        <PWARegister />
        <ToastProvider>
          <AppShell>{children}</AppShell>
          <Toaster />
        </ToastProvider>
      </body>
    </html>
  );
}