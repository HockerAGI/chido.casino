import type { Metadata } from "next";
import "./globals.css";
import AppShell from "./_components/AppShell";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://chido.casino"
  ),
  title: "Chido Casino",
  description: "Casino social con depósitos manuales y control de wallet.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
