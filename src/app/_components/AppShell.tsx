"use client";

import { usePathname } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Fuera de shell: landing + auth + redirects
  const noShell =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/r/");

  if (noShell) return <>{children}</>;
  return <MainLayout>{children}</MainLayout>;
}