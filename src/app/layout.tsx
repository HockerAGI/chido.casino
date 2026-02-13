import type { Metadata, Viewport } from "next";
import "./globals.css";
import { MainLayout } from "@/components/layout/main-layout";
import { ToastProvider } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

// CONFIGURACIÓN CORRECTA DE VIEWPORT PARA NEXT.JS 14+
export const viewport: Viewport = {
  themeColor: "#050510",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Evita zoom automático en inputs (crítico para UX móvil)
  userScalable: false,
};

export const metadata: Metadata = {
  title: {
    default: "CHIDO | El Rey de México 🇲🇽",
    template: "%s | CHIDO",
  },
  description: "CHIDO — Casino y Entretenimiento. Juega responsable.",
  applicationName: "CHIDO",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CHIDO",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/favicon-32x32.png",
    apple: "/icon-192.png",
  },
  openGraph: {
    title: "CHIDO | Gana en Fa ⚡️",
    description: "La plataforma más rápida de México.",
    url: "https://chido.casino",
    siteName: "CHIDO",
    images: [
      {
        url: "/opengraph-image.jpg",
        width: 1200,
        height: 630,
        alt: "CHIDO Casino",
      },
    ],
    locale: "es_MX",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className="antialiased bg-[#050510] text-white overflow-x-hidden selection:bg-[#FF0099] selection:text-white">
        <ToastProvider>
          <MainLayout>{children}</MainLayout>
          <Toaster />
        </ToastProvider>
      </body>
    </html>
  );
}