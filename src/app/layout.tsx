import type { Metadata, Viewport } from "next";
import "./globals.css";
import PWARegister from "@/app/_components/PWARegister";

export const metadata: Metadata = {
  title: { default: "Chido Casino", template: "%s · Chido Casino" },
  description: "Chido Casino — Auth + Wallet realtime (balances) + Depósitos Stripe + Webhook + Risk server-side",
  applicationName: "Chido Casino",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Chido" },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/icon-192.png" }]
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#00F0FF"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <PWARegister />
        {children}
      </body>
    </html>
  );
}