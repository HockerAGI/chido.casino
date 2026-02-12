"use client";

import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/cn";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed right-4 top-4 z-50 flex w-[340px] flex-col gap-3">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "rounded-2xl border p-4 shadow-lg backdrop-blur",
            t.variant === "destructive"
              ? "border-red-500/30 bg-red-500/10 text-white"
              : "border-white/10 bg-black/60 text-white"
          )}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1">
              {t.title && <div className="text-sm font-bold">{t.title}</div>}
              {t.description && (
                <div className="mt-1 text-sm text-white/75">
                  {t.description}
                </div>
              )}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs hover:bg-white/10"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}