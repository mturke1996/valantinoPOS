"use client";

import { cn } from "@/lib/utils";
import { TIME_RANGE_OPTIONS, type TimeRange } from "./use-statistics-data";

export interface TimeRangeToggleProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  className?: string;
}

/**
 * Segmented chocolate-glass toggle for the time range.
 * Keyboard accessible (native radio inputs visually styled as a pill group).
 */
export function TimeRangeToggle({
  value,
  onChange,
  className,
}: TimeRangeToggleProps) {
  return (
    <div
      role="group"
      aria-label="نطاق الوقت"
      className={cn(
        "inline-flex items-center gap-1 rounded-xl border border-cacao-800/10 bg-cream-100/60 p-1 dark:bg-cacao-800/20",
        className,
      )}
    >
      {TIME_RANGE_OPTIONS.map((option) => {
        const active = option.key === value;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            aria-pressed={active}
            className={cn(
              "relative rounded-lg px-3 py-1.5 text-xs font-medium tabular-nums transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-card text-foreground shadow-[0_1px_2px_hsl(24_33%_18%/0.18),0_0_0_1px_hsl(24_33%_18%/0.06)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
