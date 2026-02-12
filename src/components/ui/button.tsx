"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20";

    const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
      default: "bg-white text-black hover:bg-white/90",
      secondary: "border border-white/10 bg-white/5 text-white hover:bg-white/10",
      outline: "border border-white/15 bg-transparent text-white hover:bg-white/5",
      ghost: "bg-transparent text-white hover:bg-white/5",
      destructive: "bg-red-500 text-white hover:bg-red-500/90",
    };

    const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
      default: "h-11 px-5 py-2",
      sm: "h-9 px-4",
      lg: "h-12 px-6",
      icon: "h-11 w-11 p-0",
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";