import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MainLayout } from "@/components/layout/main-layout";
import { Toaster } from "@/components/ui/toaster"; // ✅ agrega esto

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "CHIDO | El Rey de México 🇲🇽",
    template: "%s | CHIDO",
  },
  description: "CHIDO — plataforma de entretenimiento y juegos. Juega responsable.",
  applicationName: "CHIDO",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-192.png",
  },
  openGraph: {
    title: "CHIDO | Gana en Fa ⚡️",
    description: "CHIDO — plataforma de entretenimiento y juegos. Juega responsable.",
    url: "https://chido.casino",
    siteName: "CHIDO",
    images: [
      { url: "/opengraph-image.jpg", width: 1200, height: 630, alt: "CHIDO" },
    ],
    locale: "es_MX",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CHIDO",
    description: "CHIDO — plataforma de entretenimiento y juegos.",
    images: ["/opengraph-image.jpg"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <MainLayout>{children}</MainLayout>

        {/* ✅ Toaster global (overlay) */}
        <Toaster />
      </body>
    </html>
  );
}