"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  Eye,
  MapPin,
  PartyPopper,
  Pencil,
  Plus,
  Truck,
  Users,
} from "lucide-react";
import { format, parseISO, startOfDay } from "date-fns";
import { ar } from "date-fns/locale";

import { EventCreateDialog } from "@/components/events/event-create-dialog";
import { EventEditDialog } from "@/components/events/event-edit-dialog";
import { WhatsAppOrderShareButton } from "@/components/orders/whatsapp-order-share-button";
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
import { cn, formatNumber } from "@/lib/utils";
import type { Event, Order } from "@/types";

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

type EventFilter = "all" | "upcoming" | "balance" | "overdue" | "today";

type EventRow = {
  event: Event;
  order: Order;
  customerName: string;
};

function typeChip(order: Order, event: Event): string {
  if (order.type === "delivery") return "توصيل";
  if (order.type === "reservation") return "حجز";
  return EVENT_LABELS[event.eventType] ?? event.eventType;
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EventRow | null>(null);
  const [filter, setFilter] = useState<EventFilter>("all");
  const [search, setSearch] = useState("");

  const loadEvents = useCallback(() => {
    const state = getState();
    const scheduledOrders = getOrders().filter(
      (order) =>
        !order.deletedAt &&
        order.status !== "cancelled" &&
        (order.type === "event" ||
          order.type === "reservation" ||
          order.type === "delivery") &&
        (order.deliveryDate || state.events.some((e) => e.orderId === order.id)),
    );
    const orderMap = new Map(scheduledOrders.map((order) => [order.id, order]));
    const customerMap = new Map(
      state.customers.map((customer) => [customer.id, customer.name]),
    );
    const byOrderId = new Map(state.events.map((event) => [event.orderId, event]));

    const mapped = scheduledOrders
      .map((order) => {
        const event =
          byOrderId.get(order.id) ??
          ({
            id: `synthetic-${order.id}`,
            orderId: order.id,
            eventType: order.type === "delivery" ? "gift" : "other",
            guestCount: Math.max(
              1,
              Math.round(
                order.items.reduce((sum, item) => sum + item.quantity, 0),
              ),
            ),
            packagingColors: [],
            giftCardMessage: null,
            giftCardPhrase: null,
            specialNotes: order.notes,
            createdAt: order.createdAt,
          } satisfies Event);

        return {
          event,
          order,
          customerName: order.customerId
            ? (customerMap.get(order.customerId) ?? "عميل")
            : (order.deliveryRecipientName ?? "عميل نقدي"),
        };
      })
      .filter(({ order }) => orderMap.has(order.id))
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
      outstanding += Math.max(0, order.total - order.paidAmount);
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
        (order.deliveryZone ?? "").toLocaleLowerCase("ar").includes(query) ||
        (order.type === "reservation" && "حجز".includes(query)) ||
        (EVENT_LABELS[event.eventType] ?? event.eventType).includes(query);
      if (!matchesSearch) return false;

      if (filter === "balance") return order.paidAmount < order.total;
      if (filter === "today") {
        return (
          order.deliveryDate === todayKey &&
          order.status !== "completed" &&
          order.status !== "cancelled"
        );
      }
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
  }, [events, filter, search, today, todayKey]);

  if (loading) {
    return (
      <div className="space-y-3 py-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <PageHeader
        title="المناسبات"
        description={`${formatNumber(stats.dueToday)} اليوم · ${formatNumber(stats.upcoming)} قادمة · ${formatNumber(stats.overdue)} متأخرة`}
        actions={
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <Button
              className="min-h-11 flex-1 sm:flex-none"
              onClick={() => setCreateOpen(true)}
            >
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="بحث برقم الطلب أو العميل أو المناسبة"
          aria-label="بحث في المناسبات"
          className="h-11 min-w-0 flex-1"
        />
        <div className="flex items-center gap-2 rounded-xl border border-cacao-800/10 bg-white px-3 py-2 text-sm sm:shrink-0">
          <span className="text-muted-foreground">أرصدة</span>
          <CurrencyDisplay
            amount={stats.outstanding}
            className="font-semibold"
          />
        </div>
      </div>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {(
          [
            { value: "all" as const, label: "الكل" },
            { value: "today" as const, label: "اليوم" },
            { value: "upcoming" as const, label: "القادمة" },
            { value: "balance" as const, label: "تحتاج تحصيل" },
            { value: "overdue" as const, label: "المتأخرة" },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
              filter === option.value
                ? "bg-cacao-800 text-cream-50"
                : "bg-muted/70 text-muted-foreground hover:bg-muted",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {filteredEvents.length === 0 ? (
        <EmptyState
          icon={PartyPopper}
          title={
            events.length === 0 ? "لا توجد مناسبات أو توصيل" : "لا توجد نتائج"
          }
          description={
            events.length === 0
              ? "احجز مناسبة أو توصيل بموعد ليظهر هنا"
              : "غيّر البحث أو المرشح"
          }
          action={
            events.length === 0 ? (
              <Button onClick={() => setCreateOpen(true)}>حجز مناسبة</Button>
            ) : null
          }
        />
      ) : (
          <div className="rounded-xl border border-cacao-800/10 bg-white">
          <div className="hidden items-center gap-4 border-b border-cacao-800/8 bg-cream-50/80 px-4 py-2.5 text-[11px] font-semibold text-muted-foreground lg:flex">
            <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto_minmax(0,1.15fr)_auto] items-center gap-3">
              <span>الطلب</span>
              <span>العميل</span>
              <span>النوع</span>
              <span>الموعد</span>
              <span>الحالة</span>
            </div>
            <span className="w-28 shrink-0 text-end">المبلغ</span>
            <span className="w-[7.5rem] shrink-0 text-end">إجراءات</span>
          </div>

          <ul className="divide-y divide-cacao-800/8">
            {filteredEvents.map(({ event, order, customerName }) => {
              const balance = Math.max(0, order.total - order.paidAmount);
              const overdue =
                !!order.deliveryDate &&
                parseISO(order.deliveryDate) < today &&
                order.status !== "completed" &&
                order.status !== "cancelled";
              const dueToday = order.deliveryDate === todayKey;

              return (
                <li key={event.id}>
                  {/* Mobile */}
                  <div className="space-y-3 p-3.5 lg:hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold">
                            {order.orderNumber}
                          </span>
                          <Badge variant="outline" className="h-5 text-[10px]">
                            {typeChip(order, event)}
                          </Badge>
                          {dueToday ? (
                            <Badge className="h-5 bg-pistachio-400 text-[10px] text-white hover:bg-pistachio-400">
                              اليوم
                            </Badge>
                          ) : null}
                          {overdue ? (
                            <Badge
                              variant="destructive"
                              className="h-5 text-[10px]"
                            >
                              متأخر
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          {customerName}
                        </p>
                      </div>
                      <StatusBadge status={order.status} type="order" />
                    </div>

                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3.5" />
                        {formatNumber(event.guestCount)}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1",
                          overdue && "font-medium text-destructive",
                          dueToday && !overdue && "font-medium text-pistachio-400",
                        )}
                      >
                        <CalendarClock className="size-3.5" />
                        {order.deliveryDate
                          ? format(parseISO(order.deliveryDate), "dd MMM yyyy", {
                              locale: ar,
                            })
                          : "بدون موعد"}
                        {order.deliveryTime ? ` · ${order.deliveryTime}` : ""}
                      </span>
                      {order.deliveryZone || order.deliveryAddress ? (
                        <span className="inline-flex max-w-full items-center gap-1 truncate">
                          {order.type === "delivery" ? (
                            <Truck className="size-3.5 shrink-0" />
                          ) : (
                            <MapPin className="size-3.5 shrink-0" />
                          )}
                          <span className="truncate">
                            {order.deliveryZone || order.deliveryAddress}
                          </span>
                        </span>
                      ) : null}
                    </div>

                    <div>
                      <CurrencyDisplay
                        amount={order.total}
                        className="text-sm font-semibold"
                      />
                      {balance > 0 ? (
                        <p className="mt-0.5 text-[11px] text-caramel-500">
                          متبقي{" "}
                          <CurrencyDisplay
                            amount={balance}
                            className="inline text-[11px]"
                          />
                        </p>
                      ) : (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          مدفوع
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-[auto_auto_1fr] gap-1.5">
                      <WhatsAppOrderShareButton
                        order={order}
                        variant="outline"
                        size="icon"
                        label=""
                        className="size-9"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-9"
                        aria-label="تعديل"
                        onClick={() =>
                          setEditTarget({ event, order, customerName })
                        }
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button asChild size="sm" variant="secondary" className="w-full">
                        <Link href={`/orders?highlight=${order.id}`}>
                          الطلب
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {/* Desktop: info grows, amount + actions never shrink */}
                  <div className="hidden items-center gap-4 px-4 py-3 lg:flex">
                    <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto_minmax(0,1.15fr)_auto] items-center gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">
                          {order.orderNumber}
                        </p>
                        {(dueToday || overdue) && (
                          <p
                            className={cn(
                              "mt-0.5 text-[11px] font-medium",
                              overdue
                                ? "text-destructive"
                                : "text-pistachio-400",
                            )}
                          >
                            {overdue ? "متأخر" : "اليوم"}
                          </p>
                        )}
                      </div>
                      <p className="min-w-0 truncate text-sm">{customerName}</p>
                      <Badge
                        variant="outline"
                        className="w-fit shrink-0 text-[10px]"
                      >
                        {typeChip(order, event)}
                      </Badge>
                      <div className="min-w-0 text-xs text-muted-foreground">
                        <p className="inline-flex max-w-full items-center gap-1 truncate">
                          <CalendarClock className="size-3.5 shrink-0" />
                          <span className="truncate">
                            {order.deliveryDate
                              ? format(
                                  parseISO(order.deliveryDate),
                                  "dd MMM yyyy",
                                  { locale: ar },
                                )
                              : "—"}
                            {order.deliveryTime
                              ? ` · ${order.deliveryTime}`
                              : ""}
                          </span>
                        </p>
                        {order.deliveryZone || order.deliveryAddress ? (
                          <p className="mt-0.5 truncate">
                            {order.deliveryZone || order.deliveryAddress}
                          </p>
                        ) : null}
                      </div>
                      <div className="shrink-0">
                        <StatusBadge status={order.status} type="order" />
                      </div>
                    </div>

                    <div className="w-28 shrink-0 text-end tabular-nums">
                      <CurrencyDisplay
                        amount={order.total}
                        className="text-sm font-semibold"
                      />
                      {balance > 0 ? (
                        <p className="mt-0.5 text-[11px] text-caramel-500">
                          متبقي{" "}
                          <CurrencyDisplay
                            amount={balance}
                            className="inline text-[11px]"
                          />
                        </p>
                      ) : (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          مدفوع
                        </p>
                      )}
                    </div>

                    <div className="flex w-[7.5rem] shrink-0 items-center justify-end gap-1">
                      <WhatsAppOrderShareButton
                        order={order}
                        variant="outline"
                        size="icon"
                        label=""
                        className="size-8"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-8"
                        aria-label="تعديل"
                        title="تعديل"
                        onClick={() =>
                          setEditTarget({ event, order, customerName })
                        }
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label="عرض الطلب"
                        title="عرض"
                      >
                        <Link href={`/orders?highlight=${order.id}`}>
                          <Eye className="size-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
