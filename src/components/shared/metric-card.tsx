"use client";

import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";

import { Sparkline } from "@/components/charts/sparkline";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type MetricAccent = "gold" | "caramel" | "pistachio" | "cacao" | "berry";

const ACCENT_HEX: Record<MetricAccent, string> = {
  gold: "#D4AF37",
  caramel: "#C4956A",
  pistachio: "#8FB996",
  cacao: "#3D2B1F",
  berry: "#8B3A62",
};

const ACCENT_CHIP: Record<MetricAccent, string> = {
  gold: "bg-gold-400/15 text-gold-400",
  caramel: "bg-caramel-500/15 text-caramel-500",
  pistachio: "bg-pistachio-400/15 text-pistachio-400",
  cacao: "bg-cacao-800/10 text-cacao-800 dark:text-cream-100/80",
  berry: "bg-berry-500/15 text-berry-500",
};

export interface MetricCardProps {
  label: string;
  /** String/number for plain values, or a node like <CurrencyDisplay/> for money. */
  value: React.ReactNode;
  delta?: number;
  deltaLabel?: string;
  /** Legacy skeleton sparkline (kept for backward compatibility). */
  showSparkline?: boolean;
  /** Real sparkline trend data — renders a live mini chart when provided. */
  sparklineData?: number[];
  className?: string;
  size?: "default" | "wide";
  icon?: LucideIcon;
  accent?: MetricAccent;
}

export function MetricCard({
  label,
  value,
  delta,
  deltaLabel,
  showSparkline = false,
  sparklineData,
  className,
  size = "default",
  icon: Icon,
  accent = "gold",
}: MetricCardProps) {
  const isPositive = delta !== undefined && delta >= 0;
  const hasDelta = delta !== undefined;
  const hasSparklineData =
    Array.isArray(sparklineData) && sparklineData.length > 0;
  const accentHex = ACCENT_HEX[accent];

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-cacao-800/8 bg-card shadow-none",
        "chart-rise",
        "transition-shadow duration-300 hover:shadow-[0_8px_28px_-14px_hsl(24_33%_18%/0.28)]",
        "before:pointer-events-none before:absolute before:inset-[1px] before:rounded-[calc(var(--radius)-1px)] before:border before:border-cacao-800/[0.04]",
        size === "wide" && "sm:col-span-2",
        className,
      )}
    >
      <CardContent className="flex h-full flex-col justify-between gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {Icon ? (
              <span
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg",
                  ACCENT_CHIP[accent],
                )}
              >
                <Icon className="size-5" />
              </span>
            ) : null}
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
          {hasDelta ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums",
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
          <p className="font-sans text-3xl font-semibold tabular-nums tracking-tight text-foreground">
            {value}
          </p>
          {deltaLabel ? (
            <p className="text-xs text-muted-foreground">{deltaLabel}</p>
          ) : null}
        </div>

        {hasSparklineData ? (
          <Sparkline
            data={sparklineData}
            color={accentHex}
            height={44}
            className="mt-auto w-full"
          />
        ) : showSparkline ? (
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
