import * as SliderPrimitive from "@radix-ui/react-slider";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type SliderProps = {
  value: number;
  min?: number;
  max: number;
  step?: number;
  onValueChange: (value: number) => void;
  className?: string;
  ariaLabel: string;
};

export function Slider({
  value,
  min = 0,
  max,
  step = 0.001,
  onValueChange,
  className,
  ariaLabel,
}: SliderProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;

  if (!mounted) {
    return (
      <div className={cn("relative flex h-10 w-full items-center", className)} aria-hidden>
        <div className="relative h-1 w-full overflow-hidden rounded-full bg-surface-2 shadow-border">
          <div className="absolute h-full bg-fg" style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  }

  return (
    <SliderPrimitive.Root
      className={cn("relative flex h-10 w-full touch-none items-center select-none", className)}
      value={[value]}
      min={min}
      max={max}
      step={step}
      onValueChange={(v) => onValueChange(v[0] ?? 0)}
      aria-label={ariaLabel}
    >
      <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-surface-2 shadow-border">
        <SliderPrimitive.Range className="absolute h-full bg-fg" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block size-4 rounded-full bg-fg shadow-border transition-transform duration-quick ease-smooth hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
    </SliderPrimitive.Root>
  );
}
