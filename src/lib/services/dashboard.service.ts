import {
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subWeeks,
} from "date-fns";
import { arSA } from "date-fns/locale";
import type { AppState, DashboardStats, Order, OrderStatus } from "@/types";
import { countEventsWithinHours } from "@/lib/reminders/event-reminders";
import { parseISO } from "date-fns";

const ALL_STATUSES: OrderStatus[] = [
  "received",
  "reviewing",
  "preparing",
  "packaging",
  "ready",
  "out_for_delivery",
  "delivered",
  "completed",
  "cancelled",
];

function isCompletedSale(order: Order): boolean {
  return order.status === "completed" && order.deletedAt === null;
}

function orderRevenue(order: Order): number {
  return isCompletedSale(order) ? order.total : 0;
}

function orderCost(order: Order, state: AppState): number {
  if (!isCompletedSale(order)) return 0;
  return order.items.reduce((sum, item) => {
    const product = state.products.find((p) => p.id === item.productId);
    return sum + (product?.costPrice ?? 0) * item.quantity;
  }, 0);
}

function salesInRange(orders: Order[], start: Date, end: Date): number {
  return orders
    .filter((o) => {
      if (!isCompletedSale(o)) return false;
      const created = parseISO(o.createdAt);
      return isWithinInterval(created, { start, end });
    })
    .reduce((sum, o) => sum + o.total, 0);
}

function percentageChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export function getDashboardStats(state: AppState): DashboardStats {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 6 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 6 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const activeOrders = state.orders.filter((o) => o.deletedAt === null);
  const completedOrders = activeOrders.filter(isCompletedSale);

  const todaySales = salesInRange(activeOrders, todayStart, todayEnd);
  const weekSales = salesInRange(activeOrders, weekStart, weekEnd);
  const monthSales = salesInRange(activeOrders, monthStart, monthEnd);
  const yesterday = subDays(now, 1);
  const yesterdaySales = salesInRange(
    activeOrders,
    startOfDay(yesterday),
    endOfDay(yesterday),
  );
  const previousWeekStart = subWeeks(weekStart, 1);
  const previousWeekEnd = endOfWeek(previousWeekStart, { weekStartsOn: 6 });
  const previousWeekSales = salesInRange(
    activeOrders,
    previousWeekStart,
    previousWeekEnd,
  );
  const salesByDay = eachDayOfInterval({ start: weekStart, end: weekEnd }).map(
    (day) => ({
      date: format(day, "yyyy-MM-dd"),
      label: format(day, "EEE", { locale: arSA }),
      sales: salesInRange(activeOrders, startOfDay(day), endOfDay(day)),
    }),
  );

  const monthRevenue = completedOrders
    .filter((o) =>
      isWithinInterval(parseISO(o.createdAt), {
        start: monthStart,
        end: monthEnd,
      }),
    )
    .reduce((sum, o) => sum + o.total, 0);

  const monthCosts = completedOrders
    .filter((o) =>
      isWithinInterval(parseISO(o.createdAt), {
        start: monthStart,
        end: monthEnd,
      }),
    )
    .reduce((sum, o) => sum + orderCost(o, state), 0);

  const netProfit = monthRevenue - monthCosts;

  const newOrders = activeOrders.filter((o) =>
    isWithinInterval(parseISO(o.createdAt), { start: todayStart, end: todayEnd }),
  ).length;

  const newCustomers = state.customers.filter(
    (c) =>
      c.deletedAt === null &&
      isWithinInterval(parseISO(c.createdAt), {
        start: todayStart,
        end: todayEnd,
      }),
  ).length;

  const ordersByStatus = ALL_STATUSES.reduce(
    (acc, status) => {
      acc[status] = activeOrders.filter((o) => o.status === status).length;
      return acc;
    },
    {} as Record<OrderStatus, number>,
  );

  const productSales = new Map<
    string,
    { nameAr: string; quantitySold: number; revenue: number }
  >();

  for (const order of completedOrders) {
    for (const item of order.items) {
      const existing = productSales.get(item.productId);
      if (existing) {
        existing.quantitySold += item.quantity;
        existing.revenue += item.total;
      } else {
        productSales.set(item.productId, {
          nameAr: item.productNameAr,
          quantitySold: item.quantity,
          revenue: item.total,
        });
      }
    }
  }

  const topProducts = [...productSales.entries()]
    .map(([productId, data]) => ({ productId, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const recentOrders = [...activeOrders]
    .sort(
      (a, b) =>
        parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime(),
    )
    .slice(0, 8);

  const urgentAlerts: string[] = [];

  const overdueOrders = activeOrders.filter((o) => {
    if (!o.deliveryDate || o.status === "completed" || o.status === "cancelled")
      return false;
    return parseISO(o.deliveryDate) < todayStart;
  }).length;
  if (overdueOrders > 0) {
    urgentAlerts.push(`${overdueOrders} طلب متأخر عن موعد التسليم`);
  }

  const eventsIn24h = countEventsWithinHours(state, 24);
  if (eventsIn24h > 0) {
    urgentAlerts.push(`${eventsIn24h} مناسبة خلال 24 ساعة`);
  }
  const eventsIn48h = countEventsWithinHours(state, 48);
  if (eventsIn48h > eventsIn24h) {
    urgentAlerts.push(`${eventsIn48h - eventsIn24h} مناسبة خلال 48 ساعة`);
  }

  return {
    todaySales,
    todaySalesDelta: percentageChange(todaySales, yesterdaySales),
    weekSales,
    weekSalesDelta: percentageChange(weekSales, previousWeekSales),
    monthSales,
    netProfit,
    newOrders,
    newCustomers,
    ordersByStatus,
    lowStockProducts: 0,
    expiringBatches: 0,
    topProducts,
    recentOrders,
    urgentAlerts,
    salesByDay,
  };
}

export function getTotalRevenue(state: AppState): number {
  return state.orders
    .filter(isCompletedSale)
    .reduce((sum, o) => sum + orderRevenue(o), 0);
}
