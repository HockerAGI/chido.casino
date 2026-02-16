"use client";

import { usePathname } from "next/navigation";
import MainLayout from "@/components/layout/main-layout";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Rutas que NO deben llevar el layout del dashboard.
  const noShell =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/r/");

  if (noShell) return <>{children}</>;

  return <MainLayout>{children}</MainLayout>;
}
