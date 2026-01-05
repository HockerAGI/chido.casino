import "./globals.css";
import TopNav from "@/components/TopNav";
import MobileNav from "@/components/MobileNav";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <TopNav />
        <main className="mx-auto max-w-5xl px-4 pb-24 pt-6">{children}</main>
        <MobileNav />
      </body>
    </html>
  );
}