"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import { format, isSameDay, parseISO, startOfDay } from "date-fns";
import { arSA } from "date-fns/locale";

import {
  dayKeyFromOrder,
  MonthCalendar,
  type DayTypeCounts,
} from "@/components/calendar/month-calendar";
import { EventCreateDialog } from "@/components/events/event-create-dialog";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getOrders } from "@/lib/data/store";
import { useStoreSubscription } from "@/hooks/use-store-subscription";
import type { Order } from "@/types";

export default function CalendarPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => startOfDay(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    () => new Date(),
  );
  const [createOpen, setCreateOpen] = useState(false);

  const reload = useCallback(() => {
    const withDelivery = getOrders()
      .filter((o) => o.deliveryDate && o.status !== "cancelled")
      .sort(
        (a, b) =>
          parseISO(a.deliveryDate!).getTime() -
          parseISO(b.deliveryDate!).getTime(),
      );
    setOrders(withDelivery);
    setLoading(false);
  }, []);

  useStoreSubscription(reload);

  const countsByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const order of orders) {
      if (!order.deliveryDate) continue;
      const key = dayKeyFromOrder(order.deliveryDate);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [orders]);

  const typeCountsByDay = useMemo(() => {
    const map = new Map<string, DayTypeCounts>();
    for (const order of orders) {
      if (!order.deliveryDate) continue;
      const key = dayKeyFromOrder(order.deliveryDate);
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
  }, [orders]);

  const selectedOrders = useMemo(() => {
    if (!selectedDate) return [];
    return orders.filter((order) =>
      isSameDay(parseISO(order.deliveryDate!), selectedDate),
    );
  }, [orders, selectedDate]);

  if (loading) {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      <PageHeader
        title="تقويم التسليم"
        description="حجوزات المناسبات ومواعيد الاستلام"
        actions={
          <Button className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            حجز مناسبة
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        <div className="space-y-3">
          <MonthCalendar
            month={month}
            onMonthChange={setMonth}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            countsByDay={countsByDay}
            typeCountsByDay={typeCountsByDay}
          />
          <div className="flex flex-wrap gap-x-3 gap-y-2 px-1 text-xs text-muted-foreground">
            {[
              {
                label: "توصيل",
                className: "bg-pistachio-400/30 ring-1 ring-pistachio-400/40",
              },
              {
                label: "مناسبة",
                className: "bg-gold-400/35 ring-1 ring-gold-400/45",
              },
              {
                label: "حجز",
                className: "bg-berry-500/25 ring-1 ring-berry-500/35",
              },
              {
                label: "استلام",
                className: "bg-cacao-800/15 ring-1 ring-cacao-800/25",
              },
            ].map((item) => (
              <span key={item.label} className="flex items-center gap-1.5">
                <span className={`size-3.5 rounded-md ${item.className}`} />
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <Card className="border-cacao-800/8 shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="size-4 text-gold-400" />
              {selectedDate
                ? format(selectedDate, "EEEE، d MMMM yyyy", { locale: arSA })
                : "اختر يوماً"}
              {selectedOrders.length > 0 ? (
                <span className="text-sm font-normal text-muted-foreground">
                  ({selectedOrders.length} طلب)
                </span>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedOrders.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="لا توجد تسليمات في هذا اليوم"
                description="أنشئ مناسبة جديدة أو اختر يوماً آخر"
                action={
                  <Button size="sm" onClick={() => setCreateOpen(true)}>
                    حجز مناسبة
                  </Button>
                }
              />
            ) : (
              <div className="space-y-2">
                {selectedOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/orders?highlight=${order.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-cacao-800/8 px-4 py-3.5 transition-colors active:bg-cacao-800/5 hover:border-gold-400/25 hover:bg-cream-50/40 dark:hover:bg-cacao-800/20"
                  >
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{order.orderNumber}</p>
                        <Badge variant="outline" className="text-[10px]">
                          {order.type === "event"
                            ? "مناسبة"
                            : order.type === "delivery"
                              ? "توصيل"
                              : order.type === "reservation"
                                ? "حجز"
                                : order.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {order.deliveryTime ?? "—"} ·{" "}
                        {order.deliveryAddress ?? "استلام من المتجر"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.items.length} أصناف ·{" "}
                        {order.items.reduce((s, i) => s + i.quantity, 0)} قطعة
                      </p>
                      {order.paidAmount < order.total ? (
                        <p className="text-xs text-caramel-500">
                          متبقي{" "}
                          <CurrencyDisplay
                            amount={order.total - order.paidAmount}
                            className="inline text-xs"
                          />
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <StatusBadge status={order.status} type="order" />
                      <CurrencyDisplay
                        amount={order.total}
                        className="text-sm font-semibold"
                      />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <EventCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={reload}
        initialDate={
          selectedDate ? format(selectedDate, "yyyy-MM-dd") : undefined
        }
      />
    </div>
  );
}
