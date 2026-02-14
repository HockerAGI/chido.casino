"use client";

import { usePathname } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";

const NO_SHELL_PREFIXES = ["/login", "/signup"]; // auth

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const noShell = pathname === "/" || NO_SHELL_PREFIXES.some((p) => pathname.startsWith(p));
  return noShell ? <>{children}</> : <MainLayout>{children}</MainLayout>;
}