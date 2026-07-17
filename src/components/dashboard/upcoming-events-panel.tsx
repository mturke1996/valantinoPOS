"use client";

import Link from "next/link";
import {
  CalendarClock,
  ChevronLeft,
  Clock3,
  MapPin,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UpcomingEventItem } from "@/lib/reminders/event-reminders";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";

const URGENCY_STYLES: Record<UpcomingEventItem["urgency"], string> = {
  now: "border-berry-500/45 bg-gradient-to-l from-berry-500/15 to-berry-500/[0.04] shadow-[0_10px_28px_-18px_rgba(139,58,98,0.55)]",
  today:
    "border-caramel-500/40 bg-gradient-to-l from-caramel-500/15 to-caramel-500/[0.04] shadow-[0_10px_28px_-18px_rgba(196,149,106,0.45)]",
  tomorrow:
    "border-gold-400/40 bg-gradient-to-l from-gold-400/15 to-gold-400/[0.04]",
  soon: "border-cacao-800/15 bg-cacao-800/[0.03]",
  week: "border-cacao-800/10 bg-transparent",
};

const URGENCY_COUNT_STYLES: Record<UpcomingEventItem["urgency"], string> = {
  now: "bg-berry-500/15 text-berry-700 dark:text-berry-300",
  today: "bg-caramel-500/15 text-cacao-800 dark:text-cream-100",
  tomorrow: "bg-gold-400/15 text-cacao-800 dark:text-cream-100",
  soon: "bg-cacao-800/8 text-muted-foreground",
  week: "bg-muted text-muted-foreground",
};

function summarize(items: UpcomingEventItem[]) {
  const counts: Record<UpcomingEventItem["urgency"], number> = {
    now: 0,
    today: 0,
    tomorrow: 0,
    soon: 0,
    week: 0,
  };
  for (const item of items) counts[item.urgency] += 1;
  return counts;
}

export function UpcomingEventsPanel({
  items,
  className,
}: {
  items: UpcomingEventItem[];
  className?: string;
}) {
  const counts = summarize(items);
  const spotlight = items.filter((i) =>
    ["now", "today", "tomorrow"].includes(i.urgency),
  ).length;

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-gold-400/25 shadow-none",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-gold-400/[0.08] via-transparent to-caramel-500/[0.06]"
        aria-hidden
      />
      <CardHeader className="relative flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <span className="flex size-8 items-center justify-center rounded-xl bg-gold-400/15">
              <CalendarClock className="size-4 text-gold-400" />
            </span>
            المناسبات القادمة
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {items.length === 0
              ? "لا مناسبات خلال الأيام السبعة القادمة"
              : `${formatNumber(items.length)} مناسبة · ${formatNumber(spotlight)} تحتاج اهتماماً قريباً`}
          </p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/calendar" className="gap-1">
            التقويم
            <ChevronLeft className="size-3.5" />
          </Link>
        </Button>
      </CardHeader>

      <CardContent className="relative space-y-3">
        {items.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["now", "عاجل"],
                ["today", "اليوم"],
                ["tomorrow", "غداً"],
                ["soon", "قريب"],
              ] as const
            ).map(([key, label]) =>
              counts[key] > 0 ? (
                <span
                  key={key}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium tabular-nums",
                    URGENCY_COUNT_STYLES[key],
                  )}
                >
                  <Sparkles className="size-3 opacity-70" />
                  {label} {counts[key]}
                </span>
              ) : null,
            )}
          </div>
        ) : null}

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-cacao-800/15 bg-background/60 px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              الجدول هادئ — أضف مناسبة جديدة من المناسبات أو نقطة البيع
            </p>
            <Button asChild size="sm" variant="outline" className="mt-3">
              <Link href="/events">إضافة مناسبة</Link>
            </Button>
          </div>
        ) : (
          <div className="max-h-[28rem] space-y-2.5 overflow-y-auto pe-1">
            {items.slice(0, 10).map((item) => (
              <Link
                key={item.orderId}
                href={item.href}
                className={cn(
                  "group block rounded-2xl border px-3.5 py-3.5 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:border-gold-400/40",
                  URGENCY_STYLES[item.urgency],
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold tracking-tight">
                        {item.customerName}
                      </span>
                      <Badge
                        variant="outline"
                        className="border-current/20 bg-background/50 text-[10px]"
                      >
                        {item.urgencyLabel}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {item.orderNumber}
                      </span>
                    </div>
                    {item.itemSummary ? (
                      <p className="line-clamp-1 text-sm text-foreground/80">
                        {item.itemSummary}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="size-3 opacity-70" />
                        {item.deliveryDate}
                        {item.deliveryTime ? ` · ${item.deliveryTime}` : ""}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3 opacity-70" />
                        {item.deliveryAddress ?? "استلام من المتجر"}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 rounded-xl bg-background/70 px-3 py-2 text-end backdrop-blur-sm">
                    <p className="text-sm font-bold tabular-nums text-cacao-900 dark:text-cream-50">
                      {item.countdownLabel}
                    </p>
                    <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                      {formatCurrency(item.total)}
                      {item.balance > 0
                        ? ` · متبقي ${formatCurrency(item.balance)}`
                        : ""}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
