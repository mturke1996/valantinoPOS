"use client";

import type { LucideIcon } from "lucide-react";
import { BarChart3 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

export interface StatChartCardProps {
  title: string;
  icon?: LucideIcon;
  /** Hex accent for the icon chip (e.g. "#D4AF37"). */
  accent?: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: LucideIcon;
  children: React.ReactNode;
}

/**
 * Consistent chart surface: soft elevation, icon chip, optional header action,
 * and a graceful centered empty state that replaces the chart area when empty.
 */
export function StatChartCard({
  title,
  icon: Icon,
  accent = "#D4AF37",
  subtitle,
  action,
  className,
  bodyClassName,
  empty = false,
  emptyTitle = "لا توجد بيانات",
  emptyDescription = "ستظهر البيانات عند توفر مبيعات في هذه الفترة",
  emptyIcon: EmptyIcon,
  children,
}: StatChartCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border-cacao-800/8 bg-card shadow-[0_1px_0_0_hsl(var(--border))]",
        "chart-rise",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="flex items-center gap-2.5">
          {Icon ? (
            <span
              className="flex size-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${accent}1f`, color: accent }}
            >
              <Icon className="size-4" />
            </span>
          ) : null}
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {subtitle ? (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <CardContent className={cn("relative p-5 pt-4", bodyClassName)}>
        {empty ? (
          <div className="flex min-h-[220px] items-center justify-center">
            <EmptyState
              icon={EmptyIcon ?? Icon ?? BarChart3}
              title={emptyTitle}
              description={emptyDescription}
              className="py-8"
            />
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
