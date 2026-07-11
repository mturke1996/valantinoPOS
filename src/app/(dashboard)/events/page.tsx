"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  CircleDollarSign,
  Gift,
  PartyPopper,
  Pencil,
  Plus,
  Search,
} from "lucide-react";
import { format, parseISO, startOfDay } from "date-fns";

import { EventCreateDialog } from "@/components/events/event-create-dialog";
import { EventEditDialog } from "@/components/events/event-edit-dialog";
import { GiftBoxBuilder } from "@/components/events/gift-box-builder";
import { ChocolateBarProgress } from "@/components/signature/chocolate-bar-progress";
import type { OrderPipelineStage } from "@/components/signature/chocolate-bar-progress";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getOrders, getState } from "@/lib/data/store";
import { useStoreSubscription } from "@/hooks/use-store-subscription";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import type { Event, Order, OrderStatus } from "@/types";

const EVENT_LABELS: Record<string, string> = {
  wedding: "زفاف",
  engagement: "خطوبة",
  birth: "مواليد",
  success: "نجاح",
  graduation: "تخرج",
  birthday: "عيد ميلاد",
  corporate: "شركات",
  gift: "هدية",
  other: "أخرى",
};

const LEGACY_COLOR_MAP: Record<string, string> = {
  ذهبي: "#D4AF37",
  كريمي: "#F5EDE3",
  أبيض: "#FFFFFF",
  كاكاو: "#3D2B1F",
  توتي: "#8B3A62",
  فستقي: "#8FB996",
};

type EventFilter = "all" | "upcoming" | "balance" | "overdue";

function toPipelineStage(status: OrderStatus): OrderPipelineStage {
  return status === "cancelled" ? "received" : status;
}

function colorValue(value: string): string {
  return LEGACY_COLOR_MAP[value] ?? value;
}

export default function EventsPage() {
  const [events, setEvents] = useState<
    Array<{ event: Event; order: Order; customerName: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [giftBoxOpen, setGiftBoxOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<{
    event: Event;
    order: Order;
    customerName: string;
  } | null>(null);
  const [filter, setFilter] = useState<EventFilter>("all");
  const [search, setSearch] = useState("");

  const loadEvents = useCallback(() => {
    const state = getState();
    const orderMap = new Map(
      getOrders()
        .filter(
          (order) =>
            order.type === "event" || order.type === "reservation",
        )
        .map((order) => [order.id, order]),
    );
    const customerMap = new Map(
      state.customers.map((customer) => [customer.id, customer.name]),
    );

    const mapped = state.events
      .flatMap((event) => {
        const order = orderMap.get(event.orderId);
        if (!order) return [];
        return [
          {
            event,
            order,
            customerName: order.customerId
              ? customerMap.get(order.customerId) ?? "عميل"
              : "عميل نقدي",
          },
        ];
      })
      .sort((a, b) => {
        const left = `${a.order.deliveryDate ?? "9999-12-31"} ${a.order.deliveryTime ?? "23:59"}`;
        const right = `${b.order.deliveryDate ?? "9999-12-31"} ${b.order.deliveryTime ?? "23:59"}`;
        return left.localeCompare(right);
      });

    setEvents(mapped);
    setLoading(false);
  }, []);

  useStoreSubscription(loadEvents);

  const today = startOfDay(new Date());
  const todayKey = format(today, "yyyy-MM-dd");

  const stats = useMemo(() => {
    let upcoming = 0;
    let dueToday = 0;
    let overdue = 0;
    let outstanding = 0;

    for (const { order } of events) {
      if (order.status === "cancelled" || order.status === "completed") continue;
      const balance = Math.max(0, order.total - order.paidAmount);
      outstanding += balance;
      if (!order.deliveryDate) continue;
      if (order.deliveryDate === todayKey) dueToday += 1;
      if (parseISO(order.deliveryDate) < today) overdue += 1;
      else upcoming += 1;
    }

    return { upcoming, dueToday, overdue, outstanding };
  }, [events, today, todayKey]);

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ar");
    return events.filter(({ event, order, customerName }) => {
      const matchesSearch =
        !query ||
        order.orderNumber.toLocaleLowerCase("en").includes(query) ||
        customerName.toLocaleLowerCase("ar").includes(query) ||
        (order.type === "reservation" && "حجز".includes(query)) ||
        (EVENT_LABELS[event.eventType] ?? event.eventType).includes(query);
      if (!matchesSearch) return false;

      if (filter === "balance") return order.paidAmount < order.total;
      if (filter === "overdue") {
        return (
          !!order.deliveryDate &&
          parseISO(order.deliveryDate) < today &&
          order.status !== "completed" &&
          order.status !== "cancelled"
        );
      }
      if (filter === "upcoming") {
        return (
          !!order.deliveryDate &&
          parseISO(order.deliveryDate) >= today &&
          order.status !== "completed" &&
          order.status !== "cancelled"
        );
      }
      return true;
    });
  }, [events, filter, search, today]);

  if (loading) {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      <PageHeader
        title="مكتب المناسبات"
        description="الحجوزات، العربون، التجهيز ومواعيد التسليم في مكان واحد"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => setGiftBoxOpen(true)}
            >
              <Gift className="size-4" />
              منشئ علب الهدايا
            </Button>
            <Button className="gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              حجز مناسبة
            </Button>
          </div>
        }
      />

      <EventCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={loadEvents}
      />
      <EventEditDialog
        open={Boolean(editTarget)}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        order={editTarget?.order ?? null}
        event={editTarget?.event ?? null}
        customerName={editTarget?.customerName}
        onSaved={loadEvents}
      />
      <GiftBoxBuilder
        open={giftBoxOpen}
        onOpenChange={setGiftBoxOpen}
        onSaved={loadEvents}
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div className="rounded-xl border border-gold-400/20 bg-gold-400/[0.06] p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CircleDollarSign className="size-4 text-gold-400" />
            أرصدة قيد التحصيل
          </div>
          <CurrencyDisplay
            amount={stats.outstanding}
            className="mt-3 text-3xl font-semibold"
          />
        </div>
        {[
          { label: "قادمة", value: stats.upcoming },
          { label: "تسليم اليوم", value: stats.dueToday },
          { label: "متأخرة", value: stats.overdue },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-cacao-800/8 bg-card p-5"
          >
            <p className="text-sm text-muted-foreground">{item.label}</p>
            <p className="mt-3 font-mono text-3xl font-semibold tabular-nums">
              {formatNumber(item.value)}
            </p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-xl border border-cacao-800/8 bg-card">
        <div className="flex flex-col gap-3 border-b border-cacao-800/8 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {(
              [
                { value: "all" as const, label: "الكل" },
                { value: "upcoming" as const, label: "القادمة" },
                { value: "balance" as const, label: "تحتاج تحصيل" },
                { value: "overdue" as const, label: "المتأخرة" },
              ] as const
            ).map((option) => (
              <Button
                key={option.value}
                size="sm"
                variant={filter === option.value ? "default" : "ghost"}
                onClick={() => setFilter(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          <div className="relative w-full lg:w-72">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="رقم الطلب، العميل، المناسبة"
              className="ps-9"
            />
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <EmptyState
            icon={PartyPopper}
            title={events.length === 0 ? "لا توجد مناسبات" : "لا توجد نتائج"}
            description={
              events.length === 0
                ? "أنشئ أول حجز مناسبة مع موعد وعربون"
                : "غيّر البحث أو مرشح العرض"
            }
            action={
              events.length === 0 ? (
                <Button onClick={() => setCreateOpen(true)}>حجز مناسبة</Button>
              ) : null
            }
          />
        ) : (
          <div className="divide-y divide-cacao-800/8">
            {filteredEvents.map(({ event, order, customerName }) => {
              const balance = Math.max(0, order.total - order.paidAmount);
              const overdue =
                !!order.deliveryDate &&
                parseISO(order.deliveryDate) < today &&
                order.status !== "completed" &&
                order.status !== "cancelled";

              return (
                <div
                  key={event.id}
                  className="group flex items-stretch gap-2 p-4 transition-colors hover:bg-cacao-800/[0.025] sm:p-5"
                >
                  <Link
                    href={`/orders?highlight=${order.id}`}
                    aria-label={`فتح تفاصيل الطلب ${order.orderNumber} للعميل ${customerName}`}
                    className="min-w-0 flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <article className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(220px,0.8fr)_minmax(190px,0.55fr)] lg:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{order.orderNumber}</p>
                        <Badge variant="outline">
                          {order.type === "reservation"
                            ? "حجز"
                            : EVENT_LABELS[event.eventType] ?? event.eventType}
                        </Badge>
                        <StatusBadge status={order.status} type="order" />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {customerName} · {formatNumber(event.guestCount)} ضيف/قطعة
                      </p>
                      {event.packagingColors.length > 0 ? (
                        <div className="mt-3 flex items-center gap-1.5">
                          {event.packagingColors.map((color) => (
                            <span
                              key={color}
                              className="size-4 rounded-sm border border-black/10"
                              style={{ backgroundColor: colorValue(color) }}
                              title={color}
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div>
                      <ChocolateBarProgress
                        currentStage={toPipelineStage(order.status)}
                        size="sm"
                      />
                      <div
                        className={cn(
                          "mt-2 flex items-center gap-2 text-xs",
                          overdue
                            ? "text-destructive"
                            : "text-muted-foreground",
                        )}
                      >
                        <CalendarClock className="size-3.5" />
                        {order.deliveryDate
                          ? formatDate(order.deliveryDate, "dd MMM yyyy")
                          : "بدون موعد"}
                        {order.deliveryTime ? ` · ${order.deliveryTime}` : ""}
                      </div>
                    </div>

                    <div className="flex items-end justify-between gap-4 lg:flex-col lg:items-end">
                      <div className="text-end">
                        <CurrencyDisplay
                          amount={order.total}
                          className="font-semibold"
                        />
                        <p
                          className={cn(
                            "mt-1 text-xs",
                            balance > 0
                              ? "text-caramel-500"
                              : "text-muted-foreground",
                          )}
                        >
                          {balance > 0 ? (
                            <>
                              متبقي{" "}
                              <CurrencyDisplay
                                amount={balance}
                                className="inline text-xs"
                              />
                            </>
                          ) : (
                            "مدفوع بالكامل"
                          )}
                        </p>
                      </div>
                      {order.deliveryAddress ? (
                        <p className="max-w-48 truncate text-xs text-muted-foreground">
                          {order.deliveryAddress}
                        </p>
                      ) : null}
                    </div>
                  </article>
                  </Link>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0 self-center opacity-80 transition-opacity group-hover:opacity-100"
                    aria-label={`تعديل المناسبة ${order.orderNumber}`}
                    onClick={() =>
                      setEditTarget({ event, order, customerName })
                    }
                  >
                    <Pencil className="size-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
