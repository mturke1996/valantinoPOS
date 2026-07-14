"use client";

import { useCallback, useMemo, useState } from "react";
import { ChefHat, Clock3, Package, User } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getNextOrderStatus,
  getOrderStatusConfig,
  ORDER_STATUSES,
} from "@/lib/constants/order-status";
import { useStoreSubscription } from "@/hooks/use-store-subscription";
import { getOrders, getState, updateOrderStatus } from "@/lib/data/store";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import type { Order, OrderStatus } from "@/types";

/** Prep board columns (pipeline stages before delivery completion) */
const KITCHEN_COLUMNS: OrderStatus[] = [
  "received",
  "reviewing",
  "preparing",
  "packaging",
  "ready",
  "out_for_delivery",
];

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

function isKitchenVisible(order: Order): boolean {
  // Hide completed / cancelled / delivered (incl. finished POS walk-ins)
  if (
    order.status === "cancelled" ||
    order.status === "completed" ||
    order.status === "delivered"
  ) {
    return false;
  }
  return KITCHEN_COLUMNS.includes(order.status);
}

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [advancingId, setAdvancingId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setOrders(getOrders().filter(isKitchenVisible));
    setLoading(false);
  }, []);

  useStoreSubscription(refresh);

  const byStatus = useMemo(() => {
    const map = new Map<OrderStatus, Order[]>();
    for (const status of KITCHEN_COLUMNS) {
      map.set(status, []);
    }
    for (const order of orders) {
      const list = map.get(order.status);
      if (list) list.push(order);
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        const aTime = a.deliveryDate ?? a.createdAt;
        const bTime = b.deliveryDate ?? b.createdAt;
        return aTime.localeCompare(bTime);
      });
    }
    return map;
  }, [orders]);

  const advanceStatus = (order: Order) => {
    const next = getNextOrderStatus(order.status);
    if (!next) return;
    setAdvancingId(order.id);
    try {
      updateOrderStatus(order.id, next);
      refresh();
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
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-[70vh] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <PageHeader
        title="شاشة التحضير"
        description={`${formatNumber(orders.length)} طلب في مسار التحضير`}
      />

      {orders.length === 0 ? (
        <EmptyState
          icon={ChefHat}
          title="لا طلبات للتحضير"
          description="ستظهر الطلبات الجديدة هنا حسب مرحلتها"
        />
      ) : (
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
          {KITCHEN_COLUMNS.map((status) => {
            const config =
              ORDER_STATUSES.find((s) => s.key === status) ??
              getOrderStatusConfig(status);
            const columnOrders = byStatus.get(status) ?? [];

            return (
              <section
                key={status}
                className="flex w-[min(18rem,85vw)] shrink-0 flex-col rounded-xl border border-cacao-800/10 bg-cream-50/60"
              >
                <header className="sticky top-0 z-[1] flex items-center justify-between gap-2 border-b border-cacao-800/8 bg-cream-100/90 px-3 py-3 backdrop-blur-sm">
                  <h2 className="text-sm font-semibold text-cacao-800">
                    {config?.labelAr ?? status}
                  </h2>
                  <span className="rounded-md bg-cacao-800/8 px-2 py-0.5 text-xs font-bold tabular-nums text-cacao-800">
                    {formatNumber(columnOrders.length)}
                  </span>
                </header>

                <ul className="flex max-h-[calc(100dvh-12rem)] flex-col gap-2.5 overflow-y-auto p-2.5">
                  {columnOrders.length === 0 ? (
                    <li className="rounded-lg border border-dashed border-cacao-800/15 px-3 py-8 text-center text-xs text-muted-foreground">
                      فارغ
                    </li>
                  ) : (
                    columnOrders.map((order) => {
                      const next = getNextOrderStatus(order.status);
                      const itemsCount = order.items.reduce(
                        (sum, item) => sum + item.quantity,
                        0,
                      );

                      return (
                        <li
                          key={order.id}
                          className={cn(
                            "rounded-xl border border-cacao-800/10 bg-white p-3.5 shadow-[0_1px_0_rgba(61,43,31,0.04)]",
                            "space-y-3",
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-lg font-extrabold tracking-tight text-cacao-800">
                              {order.orderNumber}
                            </p>
                            <span className="rounded-md bg-gold-400/15 px-2 py-0.5 text-[10px] font-bold text-gold-400">
                              {order.type === "pos"
                                ? "فوري"
                                : order.type === "delivery"
                                  ? "توصيل"
                                  : order.type === "event"
                                    ? "مناسبة"
                                    : order.type}
                            </span>
                          </div>

                          <div className="space-y-1.5 text-sm">
                            <p className="flex items-center gap-1.5 font-medium">
                              <User className="size-3.5 shrink-0 text-gold-400" />
                              <span className="truncate">
                                {customerNameFor(order)}
                              </span>
                            </p>
                            <p className="flex items-center gap-1.5 text-muted-foreground">
                              <Package className="size-3.5 shrink-0" />
                              {formatNumber(itemsCount)} صنف ·{" "}
                              {formatNumber(order.items.length)} سطر
                            </p>
                            <p className="flex items-center gap-1.5 text-muted-foreground">
                              <Clock3 className="size-3.5 shrink-0" />
                              {order.deliveryDate
                                ? `${formatDate(order.deliveryDate, "dd/MM")}${
                                    order.deliveryTime
                                      ? ` · ${order.deliveryTime}`
                                      : ""
                                  }`
                                : formatDate(order.createdAt, "dd/MM HH:mm")}
                            </p>
                          </div>

                          {next ? (
                            <Button
                              size="lg"
                              className="h-11 w-full text-sm font-semibold"
                              disabled={advancingId === order.id}
                              onClick={() => advanceStatus(order)}
                            >
                              نقل إلى{" "}
                              {getOrderStatusConfig(next)?.labelAr ?? next}
                            </Button>
                          ) : null}
                        </li>
                      );
                    })
                  )}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
