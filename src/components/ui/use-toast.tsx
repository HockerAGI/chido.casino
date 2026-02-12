"use client";

import * as React from "react";

type ToastVariant = "default" | "destructive";

export type ToastInput = {
  title?: string;
  description?: string;
  variant?: ToastVariant;
};

export type ToastState = ToastInput & { id: string };

type Ctx = {
  toasts: ToastState[];
  toast: (t: ToastInput) => void;
  dismiss: (id: string) => void;
};

const ToastContext = React.createContext<Ctx | null>(null);

function safeId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastState[]>([]);

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  function toast(t: ToastInput) {
    const id = safeId();
    setToasts((prev) => [{ id, ...t }, ...prev].slice(0, 3));
    setTimeout(() => dismiss(id), 3500);
  }

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider/>");
  return ctx;
}