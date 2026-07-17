"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format, isSameDay, parseISO, startOfDay } from "date-fns";
import { arSA } from "date-fns/locale";
import { CalendarDays, ChevronLeft } from "lucide-react";

import {
  dayKeyFromOrder,
  MonthCalendar,
  type DayTypeCounts,
} from "@/components/calendar/month-calendar";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Order } from "@/types";
import { cn } from "@/lib/utils";

export function DashboardCalendarPanel({
  orders,
  className,
}: {
  orders: Order[];
  className?: string;
}) {
  const [month, setMonth] = useState(() => startOfDay(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    () => new Date(),
  );

  const deliveryOrders = useMemo(
    () =>
      orders
        .filter((o) => o.deliveryDate && o.status !== "cancelled")
        .sort(
          (a, b) =>
            parseISO(a.deliveryDate!).getTime() -
            parseISO(b.deliveryDate!).getTime(),
        ),
    [orders],
  );

  const countsByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const order of deliveryOrders) {
      const key = dayKeyFromOrder(order.deliveryDate!);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [deliveryOrders]);

  const typeCountsByDay = useMemo(() => {
    const map = new Map<string, DayTypeCounts>();
    for (const order of deliveryOrders) {
      const key = dayKeyFromOrder(order.deliveryDate!);
      const current = map.get(key) ?? {};
      const type =
        order.type === "delivery"
          ? "delivery"
          : order.type === "event"
            ? "event"
            : order.type === "reservation"
              ? "reservation"
              : "other";
      map.set(key, { ...current, [type]: (current[type] ?? 0) + 1 });
    }
    return map;
  }, [deliveryOrders]);

  const selectedOrders = useMemo(() => {
    if (!selectedDate) return [];
    return deliveryOrders.filter((order) =>
      isSameDay(parseISO(order.deliveryDate!), selectedDate),
    );
  }, [deliveryOrders, selectedDate]);

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-cacao-800/10 shadow-none",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-bl from-pistachio-400/[0.06] via-transparent to-cacao-800/[0.03]"
        aria-hidden
      />
      <CardHeader className="relative flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <span className="flex size-8 items-center justify-center rounded-xl bg-pistachio-400/15">
              <CalendarDays className="size-4 text-pistachio-400" />
            </span>
            تقويم التسليم
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            اختر يوماً لعرض المواعيد — النقاط الملوّنة تشير لنوع الطلب
          </p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/calendar" className="gap-1">
            عرض كامل
            <ChevronLeft className="size-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="relative space-y-4">
        <MonthCalendar
          month={month}
          onMonthChange={setMonth}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          countsByDay={countsByDay}
          typeCountsByDay={typeCountsByDay}
          compact
        />

        <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          <LegendDot className="bg-gold-400" label="مناسبة" />
          <LegendDot className="bg-pistachio-400" label="توصيل" />
          <LegendDot className="bg-berry-500" label="حجز" />
        </div>

        <div className="rounded-2xl border border-cacao-800/8 bg-background/70 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-medium">
              {selectedDate
                ? format(selectedDate, "EEEE d MMMM", { locale: arSA })
                : "اختر يوماً"}
            </p>
            <span className="text-xs tabular-nums text-muted-foreground">
              {selectedOrders.length} موعد
            </span>
          </div>
          {selectedOrders.length === 0 ? (
            <p className="rounded-xl border border-dashed border-cacao-800/12 px-3 py-5 text-center text-xs text-muted-foreground">
              لا مواعيد في هذا اليوم
            </p>
          ) : (
            <ul className="max-h-44 space-y-2 overflow-y-auto pe-1">
              {selectedOrders.slice(0, 6).map((order) => (
                <li key={order.id}>
                  <Link
                    href="/orders"
                    className="flex items-center justify-between gap-2 rounded-xl border border-cacao-800/8 bg-card px-3 py-2.5 transition-colors hover:border-gold-400/30 hover:bg-gold-400/[0.04]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {order.orderNumber}
                        {order.deliveryTime ? ` · ${order.deliveryTime}` : ""}
                      </p>
                      <div className="mt-1">
                        <StatusBadge status={order.status} type="order" />
                      </div>
                    </div>
                    <CurrencyDisplay
                      amount={order.total}
                      className="shrink-0 text-xs font-semibold"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LegendDot({
  className,
  label,
}: {
  className: string;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-2 rounded-full", className)} />
      {label}
    </span>
  );
}
