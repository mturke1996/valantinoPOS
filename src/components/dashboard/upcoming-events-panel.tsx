"use client";

import Link from "next/link";
import { CalendarClock, ChevronLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UpcomingEventItem } from "@/lib/reminders/event-reminders";
import { cn, formatCurrency } from "@/lib/utils";

const URGENCY_STYLES: Record<
  UpcomingEventItem["urgency"],
  string
> = {
  now: "border-berry-500/40 bg-berry-500/10 text-berry-700 dark:text-berry-300",
  today: "border-caramel-500/40 bg-caramel-500/10 text-cacao-800 dark:text-cream-100",
  tomorrow: "border-gold-400/40 bg-gold-400/10 text-cacao-800 dark:text-cream-100",
  soon: "border-cacao-800/15 bg-cacao-800/[0.04] text-cacao-800 dark:text-cream-100",
  week: "border-cacao-800/10 bg-transparent text-muted-foreground",
};

export function UpcomingEventsPanel({
  items,
  className,
}: {
  items: UpcomingEventItem[];
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "border-cacao-800/8 shadow-none",
        className,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="size-4 text-gold-400" />
          المناسبات القادمة
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/calendar" className="gap-1">
            التقويم
            <ChevronLeft className="size-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-cacao-800/15 px-4 py-6 text-center text-sm text-muted-foreground">
            لا توجد مناسبات خلال الأيام القادمة — الجدول هادئ
          </p>
        ) : (
          items.slice(0, 8).map((item) => (
            <Link
              key={item.orderId}
              href={item.href}
              className={cn(
                "block rounded-xl border px-3.5 py-3 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-gold-400/35 hover:bg-gold-400/[0.04]",
                URGENCY_STYLES[item.urgency],
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{item.orderNumber}</span>
                    <Badge
                      variant="outline"
                      className="border-current/20 bg-background/40 text-[10px]"
                    >
                      {item.urgencyLabel}
                    </Badge>
                  </div>
                  <p className="text-sm text-current/80">
                    {item.customerName}
                    {item.itemSummary ? ` · ${item.itemSummary}` : ""}
                  </p>
                  <p className="text-xs text-current/65">
                    {item.deliveryDate}
                    {item.deliveryTime ? ` · ${item.deliveryTime}` : ""}
                    {item.deliveryAddress
                      ? ` · ${item.deliveryAddress}`
                      : " · استلام من المتجر"}
                  </p>
                </div>
                <div className="shrink-0 text-end">
                  <p className="text-sm font-semibold tabular-nums">
                    {item.countdownLabel}
                  </p>
                  <p className="mt-1 text-xs tabular-nums text-current/70">
                    {formatCurrency(item.total)}
                    {item.balance > 0
                      ? ` · متبقي ${formatCurrency(item.balance)}`
                      : ""}
                  </p>
                </div>
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
