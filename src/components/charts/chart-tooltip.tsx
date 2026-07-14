"use client";

import { CurrencyDisplay } from "@/components/shared/currency-display";
import { cn } from "@/lib/utils";

export interface ChartTooltipPayloadItem {
  value: number | string;
  name: string;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}

export interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayloadItem[];
  label?: string;
  title?: string;
  money?: boolean;
  unit?: string;
}

/**
 * Shared recharts tooltip — chocolate-glass surface, RTL-friendly.
 * Renders money through CurrencyDisplay so it respects branch settings.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  title,
  money = true,
  unit,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-cacao-800/10 bg-popover/95 px-3 py-2 shadow-lg backdrop-blur-sm">
      {label ? (
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">
          {label}
        </p>
      ) : null}
      <div className="space-y-1">
        {payload.map((item, i) => {
          const numeric = Number(item.value) || 0;
          return (
            <div
              key={i}
              className="flex items-center justify-between gap-4 text-sm"
            >
              <span className="flex items-center gap-1.5 text-foreground/80">
                <span
                  className="size-2 rounded-full"
                  style={{ background: item.color }}
                />
                {title ?? item.name}
              </span>
              <span className="font-semibold tabular-nums text-foreground">
                {money ? (
                  <CurrencyDisplay amount={numeric} />
                ) : unit ? (
                  <span className={cn("money-ar")}>
                    {numeric} {unit}
                  </span>
                ) : (
                  <span className="tabular-nums">{numeric}</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
