import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppShell from "./_components/AppShell";
import PWARegister from "./_components/PWARegister";
import Providers from "./_components/Providers";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://chido.casino"),
  title: { default: "Chido Casino", template: "%s • Chido Casino" },
  description: "Juegos originales, promos reales y Chido Wallet para depósitos/retiros.",
  applicationName: "CHIDO",
  manifest: "/manifest.json",
  icons: { icon: [{ url: "/icon-192.png" }, { url: "/icon-512.png" }] },
  openGraph: {
    title: "Chido Casino",
    description: "Juega chido. Promos reales. Chido Wallet claro.",
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
        <Providers>
          <PWARegister />
          <AppShell>{children}</AppShell>
        </Providers>
        <SpeedInsights />
      </body>
    </html>
  );
}