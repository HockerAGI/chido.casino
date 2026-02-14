import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import PWARegister from "@/app/_components/PWARegister";
import AppShell from "@/app/_components/AppShell";

export const metadata: Metadata = {
  title: {
    default: "CHIDO CASINO",
    template: "%s | CHIDO",
  },
  description: "CHIDO — plataforma de entretenimiento y juegos. Juega responsable.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CHIDO",
  },
  icons: {
    icon: [{ url: "/favicon.ico" }],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
  openGraph: {
    title: "CHIDO CASINO",
    description: "CHIDO — plataforma de entretenimiento y juegos. Juega responsable.",
    images: ["/opengraph-image.jpg"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CHIDO CASINO",
    description: "CHIDO — plataforma de entretenimiento y juegos. Juega responsable.",
    images: ["/opengraph-image.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#050510",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className="antialiased bg-[#050510] text-white overflow-x-hidden selection:bg-[#FF0099] selection:text-white">
        <ToastProvider>
          <PWARegister />
          <AppShell>{children}</AppShell>
          <Toaster />
        </ToastProvider>
      </body>
    </html>
  );
}