import type { Metadata, Viewport } from "next";
import "./globals.css";
import { MainLayout } from "@/components/layout/main-layout";
import { ToastProvider } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import PWARegister from "@/app/_components/PWARegister"; // ✅ IMPORTADO

export const viewport: Viewport = {
  themeColor: "#050510",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: {
    default: "CHIDO | El Rey de México 🇲🇽",
    template: "%s | CHIDO",
  },
  description: "CHIDO — Casino y Entretenimiento. Juega responsable.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CHIDO",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className="antialiased bg-[#050510] text-white overflow-x-hidden selection:bg-[#FF0099] selection:text-white">
        <ToastProvider>
          <PWARegister /> {/* ✅ COMPONENTE AÑADIDO */}
          <MainLayout>{children}</MainLayout>
          <Toaster />
        </ToastProvider>
      </body>
    </html>
  );
}
