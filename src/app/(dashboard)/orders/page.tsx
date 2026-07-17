"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  ChevronLeft,
  Eye,
  MapPin,
  Package,
  Truck,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";

import { OrderDetailDialog } from "@/components/orders/order-detail-dialog";
import { WhatsAppOrderShareButton } from "@/components/orders/whatsapp-order-share-button";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getNextOrderStatus,
  getOrderStatusConfig,
  ORDER_STATUSES,
} from "@/lib/constants/order-status";
import { useStoreSubscription } from "@/hooks/use-store-subscription";
import { getOrders, getReturns, getState, updateOrderStatus } from "@/lib/data/store";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import type { Order, OrderStatus } from "@/types";

const TYPE_LABEL: Record<string, string> = {
  pos: "فوري",
  delivery: "توصيل",
  event: "مناسبة",
  reservation: "حجز",
  online: "أونلاين",
};

type StatusFilter = "active" | "all" | "cancelled_returned" | OrderStatus;

function customerNameFor(order: Order): string {
  if (!order.customerId) {
    return order.deliveryRecipientName ?? "عميل نقدي";
  }
  return (
    getState().customers.find((customer) => customer.id === order.customerId)
      ?.name ??
    order.deliveryRecipientName ??
    "عميل"
  );
}

function isActiveOrder(order: Order): boolean {
  return (
    order.status !== "completed" &&
    order.status !== "delivered" &&
    order.status !== "cancelled"
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [returnedOrderIds, setReturnedOrderIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [search, setSearch] = useState("");
  const [advancingId, setAdvancingId] = useState<string | null>(null);

  const loadOrders = useCallback(() => {
    setOrders(getOrders());
    setReturnedOrderIds(new Set(getReturns().map((r) => r.orderId)));
    setLoading(false);
  }, []);

  useStoreSubscription(loadOrders);

  useEffect(() => {
    const highlighted = new URLSearchParams(window.location.search).get(
      "highlight",
    );
    if (highlighted) setSelectedOrderId(highlighted);
  }, []);

  const stats = useMemo(() => {
    const active = orders.filter(isActiveOrder);
    let preparing = 0;
    let ready = 0;
    let balance = 0;
    for (const order of active) {
      if (
        order.status === "preparing" ||
        order.status === "packaging" ||
        order.status === "reviewing"
      ) {
        preparing += 1;
      }
      if (order.status === "ready" || order.status === "out_for_delivery") {
        ready += 1;
      }
      balance += Math.max(0, order.total - order.paidAmount);
    }
    return {
      active: active.length,
      preparing,
      ready,
      balance,
    };
  }, [orders]);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ar");
    return orders
      .filter((order) => {
        if (statusFilter === "active") return isActiveOrder(order);
        if (statusFilter === "all") return order.status !== "cancelled";
        if (statusFilter === "cancelled_returned")
          return (
            order.status === "cancelled" || returnedOrderIds.has(order.id)
          );
        return order.status === statusFilter;
      })
      .filter((order) => {
        if (!query) return true;
        const customer = customerNameFor(order).toLocaleLowerCase("ar");
        return (
          order.orderNumber.toLocaleLowerCase("en").includes(query) ||
          customer.includes(query) ||
          (order.deliveryZone ?? "").toLocaleLowerCase("ar").includes(query) ||
          (TYPE_LABEL[order.type] ?? "").includes(query)
        );
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [orders, returnedOrderIds, search, statusFilter]);

  const selectedOrder = selectedOrderId
    ? (orders.find((order) => order.id === selectedOrderId) ?? null)
    : null;

  const advanceStatus = (order: Order) => {
    const next = getNextOrderStatus(order.status);
    if (!next) return;
    setAdvancingId(order.id);
    try {
      updateOrderStatus(order.id, next);
      loadOrders();
      toast.success(
        `تم النقل إلى «${getOrderStatusConfig(next)?.labelAr ?? next}»`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل تحديث الحالة");
    } finally {
      setAdvancingId(null);
    }
  };

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
        title="الطلبات"
        description={`${formatNumber(stats.active)} نشطة · تجهيز ${formatNumber(stats.preparing)} · جاهزة ${formatNumber(stats.ready)}`}
      />

      <OrderDetailDialog
        order={selectedOrder}
        open={selectedOrder !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedOrderId(null);
        }}
        onUpdated={loadOrders}
      />

      {orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="لا توجد طلبات"
          description="ستظهر الطلبات الجديدة هنا"
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="بحث برقم الطلب أو العميل أو المنطقة"
                aria-label="بحث في الطلبات"
                className="h-11"
              />
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-cacao-800/10 bg-white px-3 py-2 text-sm sm:shrink-0">
              <span className="text-muted-foreground">أرصدة</span>
              <CurrencyDisplay
                amount={stats.balance}
                className="font-semibold"
              />
            </div>
          </div>

          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(
              [
                { value: "active" as const, label: "نشطة" },
                { value: "all" as const, label: "الكل" },
                ...ORDER_STATUSES.filter(
                  (s) => s.key !== "cancelled" && s.index >= 0,
                ).map((s) => ({
                  value: s.key as StatusFilter,
                  label: s.labelAr,
                })),
                { value: "cancelled_returned" as const, label: "ملغاة/مرتجعة" },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatusFilter(option.value)}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  statusFilter === option.value
                    ? "bg-cacao-800 text-cream-50"
                    : "bg-muted/70 text-muted-foreground hover:bg-muted",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={statusFilter === "cancelled_returned" ? Undo2 : Package}
              title={
                statusFilter === "cancelled_returned"
                  ? "لا توجد طلبات ملغاة أو مرتجعة"
                  : "لا توجد نتائج"
              }
              description={
                statusFilter === "cancelled_returned"
                  ? "ستظهر الطلبات الملغاة والمرتجعة هنا"
                  : "غيّر البحث أو الحالة"
              }
            />
          ) : (
            <div className="rounded-xl border border-cacao-800/10 bg-white">
                {/* Desktop header */}
                <div className="hidden items-center gap-4 border-b border-cacao-800/8 bg-cream-50/80 px-4 py-2.5 text-[11px] font-semibold text-muted-foreground md:flex">
                  <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto_auto_minmax(0,0.9fr)] items-center gap-3">
                    <span>الطلب</span>
                    <span>العميل</span>
                    <span>النوع</span>
                    <span>الحالة</span>
                    <span>الموعد</span>
                  </div>
                  <span className="w-28 shrink-0 text-end">المبلغ</span>
                  <span className="w-[7.5rem] shrink-0 text-end">إجراءات</span>
                </div>

                <ul className="divide-y divide-cacao-800/8">
                  {filtered.map((order) => {
                    const balance = Math.max(0, order.total - order.paidAmount);
                    const next = getNextOrderStatus(order.status);
                    const customer = customerNameFor(order);
                    const selected = order.id === selectedOrderId;

                    return (
                      <li
                        key={order.id}
                        className={cn(
                          "transition-colors",
                          selected && "bg-gold-400/[0.07]",
                        )}
                      >
                        {/* Mobile row */}
                        <div className="space-y-3 p-3.5 md:hidden">
                          <button
                            type="button"
                            className="flex w-full items-start justify-between gap-3 text-start"
                            onClick={() => setSelectedOrderId(order.id)}
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-semibold">
                                  {order.orderNumber}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="h-5 text-[10px]"
                                >
                                  {TYPE_LABEL[order.type] ?? order.type}
                                </Badge>
                              </div>
                              <p className="mt-1 truncate text-sm text-muted-foreground">
                                {customer}
                              </p>
                            </div>
                            <ChevronLeft className="mt-1 size-4 shrink-0 text-muted-foreground" />
                          </button>

                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={order.status} type="order" />
                            <StatusBadge
                              status={order.paymentStatus}
                              type="payment"
                            />
                          </div>

                          <div className="flex items-end justify-between gap-3">
                            <div className="min-w-0">
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
                              ) : null}
                            </div>
                            <div className="shrink-0 text-end text-[11px] text-muted-foreground">
                              {order.deliveryDate ? (
                                <span className="inline-flex items-center gap-1">
                                  <CalendarClock className="size-3" />
                                  {formatDate(order.deliveryDate, "dd/MM")}
                                  {order.deliveryTime
                                    ? ` · ${order.deliveryTime}`
                                    : ""}
                                </span>
                              ) : (
                                formatDate(order.createdAt, "dd/MM HH:mm")
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="w-full"
                              onClick={() => setSelectedOrderId(order.id)}
                            >
                              <Eye className="size-4" />
                              عرض
                            </Button>
                            <WhatsAppOrderShareButton
                              order={order}
                              variant="outline"
                              size="sm"
                              label="واتساب"
                              className="w-full"
                            />
                          </div>
                          {next ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full"
                              disabled={advancingId === order.id}
                              onClick={() => advanceStatus(order)}
                            >
                              نقل إلى{" "}
                              {getOrderStatusConfig(next)?.labelAr ?? next}
                            </Button>
                          ) : null}
                        </div>

                        {/* Desktop row: info grows, amount + actions never shrink */}
                        <div className="hidden items-center gap-4 px-4 py-3 md:flex">
                          <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto_auto_minmax(0,0.9fr)] items-center gap-3">
                            <button
                              type="button"
                              className="min-w-0 text-start"
                              onClick={() => setSelectedOrderId(order.id)}
                            >
                              <p className="truncate font-semibold hover:text-gold-400">
                                {order.orderNumber}
                              </p>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                {formatDate(order.createdAt, "dd/MM HH:mm")}
                              </p>
                            </button>
                            <button
                              type="button"
                              className="min-w-0 truncate text-start text-sm"
                              onClick={() => setSelectedOrderId(order.id)}
                            >
                              {customer}
                            </button>
                            <span className="shrink-0">
                              <Badge variant="outline" className="text-[10px]">
                                {TYPE_LABEL[order.type] ?? order.type}
                              </Badge>
                            </span>
                            <div className="shrink-0">
                              <StatusBadge status={order.status} type="order" />
                            </div>
                            <div className="min-w-0 text-xs text-muted-foreground">
                              {order.deliveryDate ? (
                                <span className="inline-flex max-w-full items-center gap-1 truncate">
                                  {order.type === "delivery" ? (
                                    <Truck className="size-3.5 shrink-0" />
                                  ) : (
                                    <MapPin className="size-3.5 shrink-0" />
                                  )}
                                  <span className="truncate">
                                    {formatDate(order.deliveryDate, "dd/MM")}
                                    {order.deliveryTime
                                      ? ` ${order.deliveryTime}`
                                      : ""}
                                  </span>
                                </span>
                              ) : (
                                "—"
                              )}
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
                            {next ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="size-8"
                                disabled={advancingId === order.id}
                                aria-label={`نقل إلى ${getOrderStatusConfig(next)?.labelAr ?? next}`}
                                title={`التالي: ${getOrderStatusConfig(next)?.labelAr ?? next}`}
                                onClick={() => advanceStatus(order)}
                              >
                                <ArrowLeft className="size-4" />
                              </Button>
                            ) : (
                              <span className="size-8" aria-hidden />
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              aria-label="عرض الطلب"
                              title="عرض"
                              onClick={() => setSelectedOrderId(order.id)}
                            >
                              <Eye className="size-4" />
                            </Button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
