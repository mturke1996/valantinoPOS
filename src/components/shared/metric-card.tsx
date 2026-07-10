import { TrendingDown, TrendingUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface MetricCardProps {
  label: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  showSparkline?: boolean;
  className?: string;
  size?: "default" | "wide";
}

export function MetricCard({
  label,
  value,
  delta,
  deltaLabel,
  showSparkline = false,
  className,
  size = "default",
}: MetricCardProps) {
  const isPositive = delta !== undefined && delta >= 0;
  const hasDelta = delta !== undefined;

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-cacao-800/8 bg-card shadow-none",
        "before:pointer-events-none before:absolute before:inset-[1px] before:rounded-[calc(var(--radius)-1px)] before:border before:border-cacao-800/[0.04]",
        size === "wide" && "sm:col-span-2",
        className,
      )}
    >
      <CardContent className="flex h-full flex-col justify-between gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-muted-foreground">{label}</p>
          {hasDelta ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-sm px-1.5 py-0.5 text-xs font-medium tabular-nums",
                isPositive
                  ? "bg-pistachio-400/15 text-cacao-800 dark:text-pistachio-400"
                  : "bg-berry-500/15 text-berry-500",
              )}
            >
              {isPositive ? (
                <TrendingUp className="size-3" />
              ) : (
                <TrendingDown className="size-3" />
              )}
              {isPositive ? "+" : ""}
              {delta}%
            </span>
          ) : null}
        </div>

        <div className="space-y-3">
          <p className="font-mono text-3xl font-semibold tabular-nums tracking-tight text-foreground">
            {value}
          </p>
          {deltaLabel ? (
            <p className="text-xs text-muted-foreground">{deltaLabel}</p>
          ) : null}
        </div>

        {showSparkline ? (
          <div
            className="mt-auto h-10 w-full overflow-hidden rounded-sm border border-cacao-800/6 bg-cream-100/40 dark:bg-cacao-800/20"
            aria-hidden
          >
            <Skeleton className="h-full w-full rounded-sm bg-caramel-500/10" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
