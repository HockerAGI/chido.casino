"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

type SliderProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "defaultValue" | "onChange"> & {
  value?: number[];
  defaultValue?: number[];
  onValueChange?: (value: number[]) => void;
};

export function Slider({
  className,
  value,
  defaultValue,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  disabled,
  ...props
}: SliderProps) {
  const isControlled = Array.isArray(value);
  const initial = Array.isArray(defaultValue) ? defaultValue[0] : Number(min);

  const [internalValue, setInternalValue] = React.useState<number>(
    Number.isFinite(initial) ? initial : Number(min)
  );

  React.useEffect(() => {
    if (isControlled && Array.isArray(value) && Number.isFinite(value[0])) {
      setInternalValue(value[0]);
    }
  }, [isControlled, value]);

  const currentValue = isControlled && Array.isArray(value) && Number.isFinite(value[0]) ? value[0] : internalValue;
  const minNum = Number(min);
  const maxNum = Number(max);
  const safeValue = Math.min(maxNum, Math.max(minNum, Number(currentValue)));
  const percent = maxNum === minNum ? 0 : ((safeValue - minNum) / (maxNum - minNum)) * 100;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = Number(e.target.value);
    if (!isControlled) setInternalValue(next);
    onValueChange?.([next]);
  };

  return (
    <div className={cn("relative flex w-full items-center", className)}>
      <div className="relative h-2 w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-white/70"
          style={{ width: `${percent}%` }}
        />
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        value={safeValue}
        onChange={handleChange}
        className={cn(
          "absolute inset-0 h-2 w-full appearance-none bg-transparent",
          "cursor-pointer disabled:cursor-not-allowed"
        )}
        aria-valuemin={minNum}
        aria-valuemax={maxNum}
        aria-valuenow={safeValue}
        {...props}
      />
      <style jsx>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          border: 1px solid rgba(255,255,255,0.25);
          background: white;
          box-shadow: 0 0 0 4px rgba(255,255,255,0.08);
          cursor: pointer;
        }
        input[type="range"]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          border: 1px solid rgba(255,255,255,0.25);
          background: white;
          box-shadow: 0 0 0 4px rgba(255,255,255,0.08);
          cursor: pointer;
        }
        input[type="range"]::-webkit-slider-runnable-track {
          height: 8px;
          background: transparent;
        }
        input[type="range"]::-moz-range-track {
          height: 8px;
          background: transparent;
        }
      `}</style>
    </div>
  );
}