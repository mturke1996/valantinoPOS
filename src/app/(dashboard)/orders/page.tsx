"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Package } from "lucide-react";
import { toast } from "sonner";

import { OrderDetailDialog } from "@/components/orders/order-detail-dialog";
import { ChocolateBarProgress } from "@/components/signature/chocolate-bar-progress";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ORDER_STATUSES, PIPELINE_STATUSES } from "@/lib/constants/order-status";
import { useStoreSubscription } from "@/hooks/use-store-subscription";
import { getOrders, updateOrderStatus } from "@/lib/data/store";
import { cn, formatDate } from "@/lib/utils";
import type { Order, OrderStatus } from "@/types";
import type { OrderPipelineStage } from "@/components/signature/chocolate-bar-progress";

function toPipelineStage(status: OrderStatus): OrderPipelineStage {
  if (status === "cancelled") return "received";
  return status;
}

const KANBAN_COLUMNS: OrderStatus[] = [
  "received",
  "reviewing",
  "preparing",
  "packaging",
  "ready",
  "out_for_delivery",
];

function OrderCard({
  order,
  highlighted = false,
  onOpen,
}: {
  order: Order;
  highlighted?: boolean;
  onOpen: (orderId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: order.id });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => {
        if (!isDragging) onOpen(order.id);
      }}
      className={cn(
        "cursor-grab rounded-md border border-cacao-800/10 bg-card p-3 shadow-sm transition-[box-shadow,border-color] active:cursor-grabbing",
        isDragging && "opacity-50 shadow-lg",
        highlighted && "border-gold-400/50 ring-2 ring-gold-400/15",
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold">{order.orderNumber}</span>
        <StatusBadge status={order.paymentStatus} type="payment" />
      </div>
      <ChocolateBarProgress currentStage={toPipelineStage(order.status)} size="sm" />
      <div className="mt-2 flex items-center justify-between">
        <CurrencyDisplay amount={order.total} className="text-sm font-medium" />
        <span className="text-[10px] text-muted-foreground">
          {formatDate(order.createdAt, "dd/MM")}
        </span>
      </div>
      {order.deliveryDate ? (
        <p className="mt-1 text-[10px] text-caramel-500">
          تسليم: {formatDate(order.deliveryDate)}
        </p>
      ) : null}
    </div>
  );
}

function KanbanColumn({
  status,
  orders,
  selectedOrderId,
  onOpenOrder,
}: {
  status: OrderStatus;
  orders: Order[];
  selectedOrderId: string | null;
  onOpenOrder: (orderId: string) => void;
}) {
  const config = ORDER_STATUSES.find((s) => s.key === status);
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-64 shrink-0 flex-col rounded-lg border border-cacao-800/8 bg-cream-50/50 dark:bg-cacao-800/10",
        isOver && "ring-2 ring-gold-400/50",
      )}
    >
      <div className="flex items-center justify-between border-b border-cacao-800/8 px-3 py-2">
        <span className="text-sm font-medium">{config?.labelAr}</span>
        <span className="rounded-sm bg-cacao-800/8 px-1.5 py-0.5 text-xs tabular-nums">
          {orders.length}
        </span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2" style={{ minHeight: 200 }}>
        {orders.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            لا توجد طلبات
          </p>
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              highlighted={order.id === selectedOrderId}
              onOpen={onOpenOrder}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [view, setView] = useState<"kanban" | "tabs">("kanban");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const loadOrders = useCallback(() => {
    setOrders(getOrders().filter((o) => o.status !== "cancelled"));
    setLoading(false);
  }, []);

  useStoreSubscription(loadOrders);

  useEffect(() => {
    const highlighted = new URLSearchParams(window.location.search).get(
      "highlight",
    );
    if (highlighted) setSelectedOrderId(highlighted);
  }, []);

  const ordersByStatus = useMemo(() => {
    const map = new Map<OrderStatus, Order[]>();
    for (const status of PIPELINE_STATUSES) {
      map.set(status.key, []);
    }
    for (const order of orders) {
      const list = map.get(order.status);
      if (list) list.push(order);
    }
    return map;
  }, [orders]);

  const activeOrder = activeId
    ? orders.find((o) => o.id === activeId)
    : null;
  const selectedOrder = selectedOrderId
    ? orders.find((order) => order.id === selectedOrderId) ?? null
    : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const orderId = String(active.id);
    const newStatus = String(over.id) as OrderStatus;
    const order = orders.find((o) => o.id === orderId);
    if (!order || order.status === newStatus) return;

    try {
      updateOrderStatus(orderId, newStatus);
      loadOrders();
      toast.success("تم تحديث حالة الطلب");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل تحديث الحالة");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="py-4">
        <PageHeader title="الطلبات" description="إدارة ومتابعة جميع الطلبات" />
        <EmptyState
          icon={Package}
          title="لا توجد طلبات"
          description="ستظهر الطلبات الجديدة هنا"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 py-4">
      <PageHeader
        title="الطلبات"
        description="سحب وإفلات لتحديث حالة الطلب"
      />

      <OrderDetailDialog
        order={selectedOrder}
        open={selectedOrder !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedOrderId(null);
        }}
        onUpdated={loadOrders}
      />

      <Tabs value={view} onValueChange={(v) => setView(v as "kanban" | "tabs")}>
        <TabsList>
          <TabsTrigger value="kanban">لوحة كانبان</TabsTrigger>
          <TabsTrigger value="tabs">عرض تبويبي</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="mt-4">
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-3 overflow-x-auto pb-4">
              {KANBAN_COLUMNS.map((status) => (
                <KanbanColumn
                  key={status}
                  status={status}
                  orders={ordersByStatus.get(status) ?? []}
                  selectedOrderId={selectedOrderId}
                  onOpenOrder={setSelectedOrderId}
                />
              ))}
            </div>
            <DragOverlay>
              {activeOrder ? (
                <div className="w-64 rounded-md border bg-card p-3 shadow-xl">
                  <span className="font-semibold">{activeOrder.orderNumber}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </TabsContent>

        <TabsContent value="tabs" className="mt-4">
          <Tabs defaultValue="received">
            <TabsList className="flex-wrap h-auto">
              {PIPELINE_STATUSES.map((s) => (
                <TabsTrigger key={s.key} value={s.key}>
                  {s.labelAr} ({ordersByStatus.get(s.key)?.length ?? 0})
                </TabsTrigger>
              ))}
            </TabsList>
            {PIPELINE_STATUSES.map((s) => (
              <TabsContent key={s.key} value={s.key}>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(ordersByStatus.get(s.key) ?? []).map((order) => (
                    <Card
                      key={order.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedOrderId(order.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedOrderId(order.id);
                        }
                      }}
                      className={cn(
                        "cursor-pointer border-cacao-800/8 shadow-none transition-colors hover:border-gold-400/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        order.id === selectedOrderId &&
                          "border-gold-400/50 ring-2 ring-gold-400/15",
                      )}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center justify-between text-base">
                          {order.orderNumber}
                          <StatusBadge status={order.status} type="order" />
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <ChocolateBarProgress currentStage={toPipelineStage(order.status)} />
                        <div className="flex justify-between text-sm">
                          <CurrencyDisplay amount={order.total} />
                          <span className="text-muted-foreground">
                            {formatDate(order.createdAt)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
