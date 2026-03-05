import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import AppShell from "@/app/_components/AppShell";
import PWARegister from "@/app/_components/PWARegister";
import Providers from "@/app/_components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Chido Casino",
  description: "Chido Casino - juegos y promociones",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <Providers>
          <PWARegister />
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}