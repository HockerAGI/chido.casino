"use client";

import * as React from "react";
import { ToastProvider } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      {children}
      {/* Toaster DENTRO del provider para que nunca truene useToast */}
      <Toaster />
    </ToastProvider>
  );
}