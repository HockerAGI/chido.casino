import type { Metadata, Viewport } from "next";
import "./globals.css";
import PWARegister from "@/app/_components/PWARegister";

// === METADATA & SEO (Marketing + PWA) ===
export const metadata: Metadata = {
  title: { 
    default: "Chido Casino | El Rey de México 🇲🇽", 
    template: "%s | Chido Casino" 
  },
  description: "El casino online más rápido de México. Bono de bienvenida del 200% hasta $5,000 MXN. Retiros inmediatos, Crash, Slots y apuestas deportivas.",
  applicationName: "Chido Casino",
  authors: [{ name: "Hocker AGI Technologies" }],
  keywords: ["casino mexico", "slots", "crash game", "apuestas online", "bonos casino", "dinero real"],
  manifest: "/manifest.json",
  
  // Configuración Apple (Legacy)
  appleWebApp: { 
    capable: true, 
    statusBarStyle: "black-translucent", 
    title: "Chido" 
  },

  // Iconos
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/icon-192.png" }]
  },

  // === PROTOCOLO OPEN GRAPH (Lo que viste en Vercel) ===
  // Esto hace que al compartir el link en WhatsApp se vea la imagen y el título chido.
  openGraph: {
    title: "Chido Casino | Gana en Fa ⚡️",
    description: "¡Qué onda! Entra y duplica tu primer depósito hasta $5,000 MXN. Seguridad Vertx y pagos vía Numia.",
    url: "https://chido.casino",
    siteName: "Chido Casino",
    images: [
      {
        url: "/opengraph-image.jpg", // RECUERDA: Sube esta imagen de 1200x630 a /public
        width: 1200,
        height: 630,
        alt: "Chido Casino Promo",
      },
    ],
    locale: "es_MX",
    type: "website",
  },

  // Tarjeta para Twitter/X
  twitter: {
    card: "summary_large_image",
    title: "Chido Casino 🇲🇽",
    description: "El casino oficial de la suerte mexicana. Juega ahora.",
    images: ["/opengraph-image.jpg"],
  },
};

// === VIEWPORT (Configuración Móvil) ===
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover", // Esto permite que el fondo cubra el 'notch' del celular
  themeColor: "#050510" // Color exacto del fondo (Chido Dark BG)
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX" className="dark">
      <body className="antialiased bg-[#050510] text-white selection:bg-[#FF0099] selection:text-white">
        {/* Componente para registrar la PWA (Service Worker) */}
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
