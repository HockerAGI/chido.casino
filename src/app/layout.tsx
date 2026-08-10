import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppShell from "./_components/AppShell";
import PWARegister from "./_components/PWARegister";
import Providers from "./_components/Providers";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://chidocasino.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Chido Casino — Preview", template: "%s • Chido Casino" },
  description:
    "Preview técnico de juegos originales. Sin depósitos, premios monetarios ni operación con dinero real.",
  applicationName: "CHIDO",
  manifest: "/manifest.json",
  alternates: { canonical: "/" },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      "max-snippet": 0,
      "max-image-preview": "none",
      "max-video-preview": 0,
    },
  },
  icons: { icon: [{ url: "/icon-192.png" }, { url: "/icon-512.png" }] },
  openGraph: {
    title: "Chido Casino — Preview técnico",
    description:
      "Explora juegos originales en validación. Dinero real y pagos permanecen deshabilitados.",
    url: "/",
    siteName: "Chido Casino",
    images: [{ url: "/opengraph-image.jpg" }],
    locale: "es_MX",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Chido Casino — Preview técnico",
    description:
      "Explora juegos originales en validación. Dinero real y pagos permanecen deshabilitados.",
    images: ["/opengraph-image.jpg"],
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
      </body>
    </html>
  );
}
