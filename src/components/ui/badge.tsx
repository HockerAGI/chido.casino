"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-2xl px-3 py-1 text-xs font-semibold border border-white/10 bg-white/5 text-white",
        className
      )}
      {...props}
    />
  );
}