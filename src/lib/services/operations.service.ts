import { format, isSameDay, parseISO, startOfDay } from "date-fns";

import type {
  AppState,
  Order,
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus,
} from "@/types";
import { formatMoneyLabel } from "@/lib/formatters";
import { roundMoney } from "@/lib/utils";

export type OperationKind =
  | "delivery"
  | "event"
  | "reservation"
  | "deposit"
  | "pickup";

export interface ServiceRibbonItem {
  id: string;
  orderId: string;
  orderNumber: string;
  kind: OperationKind;
  title: string;
  subtitle: string;
  time: string | null;
  amount: number;
  paidAmount: number;
  status: OrderStatus;
  href: string;
  urgent: boolean;
}

export interface PosSalesActivityEntry {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  orderType: OrderType;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  amount: number;
  cashAmount: number;
  cardAmount: number;
  transferAmount: number;
  createdAt: string;
  time: string;
}

export interface PosSalesActivity {
  collectedTotal: number;
  cashTotal: number;
  cardTotal: number;
  transferTotal: number;
  collectionCount: number;
  orderCount: number;
  averageTicket: number;
  scheduledCollections: number;
  lastAt: string | null;
  entries: PosSalesActivityEntry[];
}

function customerLabel(order: Order, state: AppState): string {
  if (!order.customerId) return "عميل نقدي";
  const customer = state.customers.find((c) => c.id === order.customerId);
  return customer?.name ?? "عميل";
}

function eventLabel(order: Order, state: AppState): string | null {
  const event = state.events.find((e) => e.orderId === order.id);
  if (!event) return null;
  if (order.type === "reservation") return "حجز";
  const labels: Record<string, string> = {
    wedding: "زفاف",
    engagement: "خطوبة",
    birth: "مواليد",
    success: "نجاح",
    graduation: "تخرج",
    birthday: "عيد ميلاد",
    corporate: "شركات",
    gift: "هدايا",
    other: "مناسبة",
  };
  return labels[event.eventType] ?? "مناسبة";
}

function parseDeliveryDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return startOfDay(new Date(year, month - 1, day));
}

export function getTodayOperations(state: AppState): ServiceRibbonItem[] {
  const today = startOfDay(new Date());
  const active = state.orders.filter((o) => o.deletedAt === null);

  const scheduled = active.filter((order) => {
    if (!order.deliveryDate || order.status === "cancelled") return false;
    return isSameDay(parseDeliveryDate(order.deliveryDate), today);
  });

  return scheduled
    .sort((a, b) => {
      const ta = a.deliveryTime ?? "99:99";
      const tb = b.deliveryTime ?? "99:99";
      return ta.localeCompare(tb);
    })
    .map((order) => {
      const eventName = eventLabel(order, state);
      const kind: OperationKind =
        order.type === "reservation"
          ? "reservation"
          : eventName
            ? "event"
            : order.paidAmount < order.total
              ? "deposit"
              : order.deliveryAddress
                ? "delivery"
                : "pickup";

      const balance = Math.max(0, order.total - order.paidAmount);
      const overdue =
        parseDeliveryDate(order.deliveryDate!) < today &&
        order.status !== "completed" &&
        order.status !== "delivered";

      return {
        id: order.id,
        orderId: order.id,
        orderNumber: order.orderNumber,
        kind,
        title: eventName
          ? `${eventName} — ${order.orderNumber}`
          : order.orderNumber,
        subtitle: [
          customerLabel(order, state),
          order.deliveryTime ?? "بدون وقت",
          order.deliveryAddress ?? "استلام من المتجر",
          balance > 0
            ? `متبقي ${formatMoneyLabel(balance, state.settings)}`
            : null,
        ]
          .filter(Boolean)
          .join(" · "),
        time: order.deliveryTime,
        amount: order.total,
        paidAmount: order.paidAmount,
        status: order.status,
        href: `/orders?highlight=${order.id}`,
        urgent: overdue || balance > 0,
      };
    });
}

export function getPosSessionStats(state: AppState, shiftId?: string | null) {
  const activity = getPosSalesActivity(state, shiftId);

  return {
    count: activity.collectionCount,
    total: activity.collectedTotal,
    lastAt: activity.lastAt,
  };
}

export function getPosSalesActivity(
  state: AppState,
  shiftId?: string | null,
): PosSalesActivity {
  const today = startOfDay(new Date());
  const orderMap = new Map(
    state.orders.filter((order) => !order.deletedAt).map((order) => [order.id, order]),
  );
  const payments = state.payments
    .filter((payment) => {
      const order = orderMap.get(payment.orderId);
      if (!order) return false;
      if (shiftId && (payment.shiftId ?? order.shiftId) !== shiftId) return false;
      return isSameDay(parseISO(payment.createdAt), today);
    })
    .sort(
      (a, b) =>
        parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime(),
    );

  const entries: PosSalesActivityEntry[] = payments.map((payment) => {
    const order = orderMap.get(payment.orderId)!;
    const customer = order.customerId
      ? state.customers.find((candidate) => candidate.id === order.customerId)
      : null;
    const cashAmount =
      payment.method === "cash"
        ? payment.cashAmount ?? payment.amount
        : payment.method === "mixed"
          ? payment.cashAmount ?? 0
          : 0;
    const cardAmount =
      payment.method === "card"
        ? payment.cardAmount ?? payment.amount
        : payment.method === "mixed"
          ? payment.cardAmount ?? 0
          : 0;
    const transferAmount =
      payment.method === "transfer" ? payment.amount : 0;

    return {
      id: payment.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: customer?.name ?? "عميل نقدي",
      orderType: order.type,
      paymentMethod: payment.method,
      paymentStatus: order.paymentStatus,
      amount: payment.amount,
      cashAmount,
      cardAmount,
      transferAmount,
      createdAt: payment.createdAt,
      time: format(parseISO(payment.createdAt), "HH:mm"),
    };
  });
  const orderIds = new Set(entries.map((entry) => entry.orderId));
  const relatedOrders = [...orderIds]
    .map((orderId) => orderMap.get(orderId))
    .filter((order): order is Order => Boolean(order));
  const collectedTotal = roundMoney(
    entries.reduce((sum, entry) => sum + entry.amount, 0),
  );

  return {
    collectedTotal,
    cashTotal: roundMoney(
      entries.reduce((sum, entry) => sum + entry.cashAmount, 0),
    ),
    cardTotal: roundMoney(
      entries.reduce((sum, entry) => sum + entry.cardAmount, 0),
    ),
    transferTotal: roundMoney(
      entries.reduce((sum, entry) => sum + entry.transferAmount, 0),
    ),
    collectionCount: entries.length,
    orderCount: orderIds.size,
    averageTicket:
      relatedOrders.length > 0
        ? roundMoney(
            relatedOrders.reduce((sum, order) => sum + order.total, 0) /
              relatedOrders.length,
          )
        : 0,
    scheduledCollections: relatedOrders.filter((order) => order.type !== "pos")
      .length,
    lastAt:
      entries.length > 0 ? entries[0]!.time : null,
    entries,
  };
}
