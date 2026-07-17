import { formatEventReminderMessage } from "@/lib/telegram/messages";
import type { AppState, Notification, Order } from "@/types";

/** Event reminders: 3 days, 2 days, and 1 day before the occasion */
export const REMINDER_OFFSETS = [
  {
    key: "3d",
    label: "قبل 3 أيام — ابدأ التجهيز",
    msBefore: 3 * 24 * 60 * 60 * 1000,
  },
  {
    key: "2d",
    label: "قبل يومين — أكمل التجهيز",
    msBefore: 2 * 24 * 60 * 60 * 1000,
  },
  {
    key: "1d",
    label: "غداً — جهّز الطلب للتسليم",
    msBefore: 24 * 60 * 60 * 1000,
  },
] as const;

export type ReminderOffsetKey = (typeof REMINDER_OFFSETS)[number]["key"];

export type UpcomingUrgency = "now" | "today" | "tomorrow" | "soon" | "week";

export interface UpcomingEventItem {
  orderId: string;
  orderNumber: string;
  customerName: string;
  deliveryDate: string;
  deliveryTime: string | null;
  deliveryAddress: string | null;
  targetMs: number;
  msUntil: number;
  daysUntil: number;
  hoursUntil: number;
  urgency: UpcomingUrgency;
  urgencyLabel: string;
  countdownLabel: string;
  itemCount: number;
  itemSummary: string;
  balance: number;
  total: number;
  status: Order["status"];
  href: string;
}

export type ReminderNotificationInput = Omit<
  Notification,
  "id" | "createdAt" | "readAt"
>;

export function resolveDeliveryTargetMs(order: Order): number | null {
  if (!order.deliveryDate) return null;
  const timePart = order.deliveryTime ?? "12:00";
  const target = new Date(`${order.deliveryDate}T${timePart}`).getTime();
  return Number.isNaN(target) ? null : target;
}

function customerNameFor(order: Order, state: AppState): string {
  if (!order.customerId) return "عميل نقدي";
  return state.customers.find((c) => c.id === order.customerId)?.name ?? "عميل";
}

function formatCountdown(msUntil: number): string {
  if (msUntil <= 0) return "الآن";
  const totalMinutes = Math.floor(msUntil / 60_000);
  if (totalMinutes < 60) return `خلال ${totalMinutes} دقيقة`;
  const hours = Math.floor(totalMinutes / 60);
  if (hours < 24) {
    const mins = totalMinutes % 60;
    return mins > 0 ? `خلال ${hours} ساعة و${mins} د` : `خلال ${hours} ساعة`;
  }
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  if (days === 1) {
    return remHours > 0 ? `غداً بعد ${remHours} ساعة` : "غداً";
  }
  return remHours > 0 ? `خلال ${days} أيام و${remHours} س` : `خلال ${days} أيام`;
}

function urgencyFor(msUntil: number, daysUntil: number): {
  urgency: UpcomingUrgency;
  urgencyLabel: string;
} {
  if (msUntil <= 2 * 60 * 60 * 1000) {
    return { urgency: "now", urgencyLabel: "عاجل الآن" };
  }
  if (daysUntil <= 0) {
    return { urgency: "today", urgencyLabel: "اليوم" };
  }
  if (daysUntil === 1) {
    return { urgency: "tomorrow", urgencyLabel: "غداً" };
  }
  if (daysUntil <= 3) {
    return { urgency: "soon", urgencyLabel: "خلال 3 أيام" };
  }
  return { urgency: "week", urgencyLabel: "خلال الأسبوع" };
}

/** Upcoming scheduled orders for dashboard + Telegram digests */
export function getUpcomingEvents(
  state: AppState,
  daysAhead = 7,
  nowMs = Date.now(),
): UpcomingEventItem[] {
  const horizon = nowMs + daysAhead * 24 * 60 * 60 * 1000;
  const items: UpcomingEventItem[] = [];

  for (const order of state.orders) {
    if (order.deletedAt || !order.deliveryDate) continue;
    if (order.status === "cancelled" || order.status === "completed") continue;

    const targetMs = resolveDeliveryTargetMs(order);
    if (targetMs === null) continue;
    // Include grace window of 2h after target
    if (targetMs + 2 * 60 * 60 * 1000 < nowMs) continue;
    if (targetMs > horizon) continue;

    const msUntil = targetMs - nowMs;
    const daysUntil = Math.max(
      0,
      Math.ceil(msUntil / (24 * 60 * 60 * 1000)),
    );
    const hoursUntil = Math.max(0, Math.ceil(msUntil / (60 * 60 * 1000)));
    const { urgency, urgencyLabel } = urgencyFor(msUntil, daysUntil);
    const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const itemSummary = order.items
      .slice(0, 3)
      .map((item) => `${item.productNameAr} ×${item.quantity}`)
      .join("، ");

    items.push({
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: customerNameFor(order, state),
      deliveryDate: order.deliveryDate,
      deliveryTime: order.deliveryTime,
      deliveryAddress: order.deliveryAddress,
      targetMs,
      msUntil,
      daysUntil,
      hoursUntil,
      urgency,
      urgencyLabel,
      countdownLabel: formatCountdown(msUntil),
      itemCount,
      itemSummary:
        itemSummary +
        (order.items.length > 3 ? ` +${order.items.length - 3}` : ""),
      balance: Math.max(0, order.total - order.paidAmount),
      total: order.total,
      status: order.status,
      href: `/orders?highlight=${order.id}`,
    });
  }

  return items.sort((a, b) => a.targetMs - b.targetMs);
}

export function countEventsWithinHours(
  state: AppState,
  hours: number,
  nowMs = Date.now(),
): number {
  const limit = nowMs + hours * 60 * 60 * 1000;
  return getUpcomingEvents(state, 7, nowMs).filter(
    (item) => item.targetMs <= limit,
  ).length;
}

/** Build in-app reminder notification payloads for due prep windows */
export function buildDueEventReminders(
  state: AppState,
  existingKeys: Set<string>,
  nowMs = Date.now(),
): ReminderNotificationInput[] {
  const today = new Date(nowMs).toISOString().slice(0, 10);
  const out: ReminderNotificationInput[] = [];
  const upcomingPrep: Array<{ order: Order; target: number }> = [];

  for (const order of state.orders) {
    if (order.deletedAt || !order.deliveryDate) continue;
    if (order.status === "cancelled" || order.status === "completed") continue;

    const target = resolveDeliveryTargetMs(order);
    if (target === null) continue;

    const customerName = customerNameFor(order, state);
    const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const balance = Math.max(0, order.total - order.paidAmount);

    if (target >= nowMs && target <= nowMs + 7 * 24 * 60 * 60 * 1000) {
      upcomingPrep.push({ order, target });
    }

    const graceUntil = target + 2 * 60 * 60 * 1000;
    for (const offset of REMINDER_OFFSETS) {
      const reminderAt = target - offset.msBefore;
      if (nowMs < reminderAt || nowMs > graceUntil) continue;
      const key = `reminder:${order.id}:${offset.key}`;
      if (existingKeys.has(key)) continue;
      const itemSummary = order.items
        .slice(0, 3)
        .map((item) => `${item.productNameAr} ×${item.quantity}`)
        .join("، ");
      const title =
        offset.key === "3d"
          ? "تذكير مناسبة — قبل 3 أيام"
          : offset.key === "2d"
            ? "تذكير مناسبة — قبل يومين"
            : "تذكير مناسبة — غداً";
      out.push({
        userId: "system",
        type: "event",
        title,
        body: `${order.orderNumber} · ${customerName} · ${offset.label} · ${itemCount} قطعة · ${itemSummary}${order.items.length > 3 ? ` +${order.items.length - 3} أصناف` : ""}${balance > 0 ? ` · متبقي ${balance.toFixed(2)}\u00A0${state.settings.currencySymbol}` : " · مدفوع"}`,
        link: `/orders?highlight=${order.id}`,
        channels: ["in_app", "push", "telegram"],
        dedupKey: key,
      });
      existingKeys.add(key);
    }

    if (order.deliveryDate !== today) continue;
    const todayKey = `delivery-today:${order.id}`;
    if (existingKeys.has(todayKey)) continue;
    out.push({
      userId: "system",
      type: "event",
      title: "تسليم اليوم",
      body: `${order.orderNumber} · ${customerName} · اليوم${order.deliveryTime ? ` ${order.deliveryTime}` : ""}${order.deliveryAddress ? ` · ${order.deliveryAddress}` : ""}`,
      link: `/orders?highlight=${order.id}`,
      channels: ["in_app", "push", "telegram"],
      dedupKey: todayKey,
    });
    existingKeys.add(todayKey);
  }

  upcomingPrep.sort((a, b) => a.target - b.target);
  const summaryKey = `prep-summary:${today}`;
  if (upcomingPrep.length > 0 && !existingKeys.has(summaryKey)) {
    const nextOrder = upcomingPrep[0]!.order;
    out.push({
      userId: "system",
      type: "event",
      title: `خطة التجهيز — ${upcomingPrep.length} طلبات قريبة`,
      body: `أقرب طلب ${nextOrder.orderNumber} في ${nextOrder.deliveryDate}${nextOrder.deliveryTime ? ` الساعة ${nextOrder.deliveryTime}` : ""} · راجع التغليف والتوصيل`,
      link: "/calendar",
      channels: ["in_app", "push", "telegram"],
      dedupKey: summaryKey,
    });
    existingKeys.add(summaryKey);
  }

  return out;
}

/** Server-side due reminders for Telegram cron (no full AppState required) */
export interface ServerOrderReminderSource {
  id: string;
  orderNumber: string;
  deliveryDate: string;
  deliveryTime: string | null;
  deliveryAddress: string | null;
  status: string;
  total: number;
  paidAmount: number;
  customerName: string;
  itemSummary: string;
  itemCount: number;
  currencySymbol: string;
}

export function buildTelegramDueReminders(
  orders: ServerOrderReminderSource[],
  existingKeys: Set<string>,
  nowMs = Date.now(),
): Array<{ dedupKey: string; text: string; offsetKey: ReminderOffsetKey | "today" }> {
  const today = new Date(nowMs).toISOString().slice(0, 10);
  const messages: Array<{
    dedupKey: string;
    text: string;
    offsetKey: ReminderOffsetKey | "today";
  }> = [];

  for (const order of orders) {
    if (order.status === "cancelled" || order.status === "completed") continue;
    const timePart = order.deliveryTime ?? "12:00";
    const target = new Date(`${order.deliveryDate}T${timePart}`).getTime();
    if (Number.isNaN(target)) continue;
    const graceUntil = target + 2 * 60 * 60 * 1000;
    const balance = Math.max(0, order.total - order.paidAmount);

    for (const offset of REMINDER_OFFSETS) {
      const reminderAt = target - offset.msBefore;
      if (nowMs < reminderAt || nowMs > graceUntil) continue;
      const key = `reminder:${order.id}:${offset.key}`;
      if (existingKeys.has(key)) continue;
      messages.push({
        dedupKey: key,
        offsetKey: offset.key,
        text: formatEventReminderMessage({
          offsetKey: offset.key,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          deliveryDate: order.deliveryDate,
          deliveryTime: order.deliveryTime,
          deliveryAddress: order.deliveryAddress,
          itemSummary: order.itemSummary,
          itemCount: order.itemCount,
          balance,
          currencySymbol: order.currencySymbol,
        }),
      });
      existingKeys.add(key);
    }

    if (order.deliveryDate === today) {
      const todayKey = `delivery-today:${order.id}`;
      if (!existingKeys.has(todayKey)) {
        messages.push({
          dedupKey: todayKey,
          offsetKey: "today",
          text: formatEventReminderMessage({
            offsetKey: "today",
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            deliveryDate: order.deliveryDate,
            deliveryTime: order.deliveryTime,
            deliveryAddress: order.deliveryAddress,
            itemSummary: order.itemSummary,
            itemCount: order.itemCount,
            balance,
            currencySymbol: order.currencySymbol,
          }),
        });
        existingKeys.add(todayKey);
      }
    }
  }

  return messages;
}
