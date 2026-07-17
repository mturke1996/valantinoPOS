"use client";

import { useMemo } from "react";
import {
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfDay,
  endOfMonth,
  format,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";
import { arSA } from "date-fns/locale";
import type { AppState, Order, OrderStatus } from "@/types";
import { ORDER_STATUSES } from "@/lib/constants/order-status";
import { STATUS_COLOR_HEX } from "@/components/charts/chart-theme";

export type TimeRange = "today" | "7d" | "30d" | "all";

export interface RangeBucket {
  key: string;
  label: string;
  sales: number;
  orders: number;
  costs: number;
  expenses: number;
}

export interface StatisticsData {
  range: TimeRange;
  buckets: RangeBucket[];
  kpis: {
    sales: number;
    salesDelta: number | null;
    orders: number;
    ordersDelta: number | null;
    avgOrder: number;
    avgOrderDelta: number | null;
    profit: number;
    profitDelta: number | null;
  };
  salesSpark: number[];
  ordersSpark: number[];
  avgOrderSpark: number[];
  profitSpark: number[];
  topProducts: Array<{ name: string; value: number; quantity: number }>;
  statusMix: Array<{ label: string; value: number; color: string }>;
  hasSales: boolean;
  hasOrders: boolean;
}

function isCompletedSale(order: Order): boolean {
  return order.status === "completed" && order.deletedAt === null;
}

function orderCost(order: Order, state: AppState): number {
  return order.items.reduce((sum, item) => {
    const product = state.products.find((p) => p.id === item.productId);
    return sum + (product?.costPrice ?? 0) * item.quantity;
  }, 0);
}

function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

interface RangeWindow {
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
}

function rangeWindow(range: TimeRange, now: Date): RangeWindow {
  const end = endOfDay(now);
  if (range === "today") {
    return {
      start: startOfDay(now),
      end,
      prevStart: startOfDay(subDays(now, 1)),
      prevEnd: endOfDay(subDays(now, 1)),
    };
  }
  if (range === "7d") {
    return {
      start: startOfDay(subDays(now, 6)),
      end,
      prevStart: startOfDay(subDays(now, 13)),
      prevEnd: endOfDay(subDays(now, 7)),
    };
  }
  if (range === "30d") {
    return {
      start: startOfDay(subDays(now, 29)),
      end,
      prevStart: startOfDay(subDays(now, 59)),
      prevEnd: endOfDay(subDays(now, 30)),
    };
  }
  // all — previous period is the same length immediately before the first order
  return {
    start: new Date(0),
    end,
    prevStart: new Date(0),
    prevEnd: new Date(0),
  };
}

function buildBuckets(
  range: TimeRange,
  now: Date,
  state: AppState,
): RangeBucket[] {
  if (range === "today") {
    // Hourly buckets for the current day (00:00 → 23:00).
    const dayStart = startOfDay(now);
    return Array.from({ length: 24 }, (_, hour) => {
      const start = new Date(dayStart);
      start.setHours(hour, 0, 0, 0);
      const end = new Date(dayStart);
      end.setHours(hour, 59, 59, 999);
      return {
        key: `h${hour}`,
        label: format(start, "HH:mm", { locale: arSA }),
        start,
        end,
      };
    }).map((b) => fillBucket(b, state));
  }

  const window = rangeWindow(range, now);
  if (range === "all") {
    const completed = state.orders.filter(isCompletedSale);
    const firstDate =
      completed.length > 0
        ? parseISO(
            completed
              .map((o) => o.createdAt)
              .sort()[0]!,
          )
        : startOfMonth(now);
    const months = eachMonthOfInterval({
      start: startOfMonth(firstDate),
      end: endOfMonth(now),
    });
    return months.map((month) => {
      const start = startOfMonth(month);
      const end = endOfMonth(month);
      return fillBucket(
        {
          key: format(month, "yyyy-MM"),
          label: format(month, "MMM yyyy", { locale: arSA }),
          start,
          end,
        },
        state,
      );
    });
  }

  const days = range === "7d" ? 7 : 30;
  const start = subDays(now, days - 1);
  const eachDays = eachDayOfInterval({ start, end: now });
  return eachDays.map((day) =>
    fillBucket(
      {
        key: format(day, "yyyy-MM-dd"),
        label: format(day, days <= 7 ? "EEE" : "d/M", { locale: arSA }),
        start: startOfDay(day),
        end: endOfDay(day),
      },
      state,
    ),
  );
}

function fillBucket(
  bucket: {
    key: string;
    label: string;
    start: Date;
    end: Date;
  },
  state: AppState,
): RangeBucket {
  let sales = 0;
  let orders = 0;
  let costs = 0;
  for (const order of state.orders) {
    if (!isCompletedSale(order)) continue;
    const created = parseISO(order.createdAt);
    if (!isWithinInterval(created, { start: bucket.start, end: bucket.end })) {
      continue;
    }
    sales += order.total;
    orders += 1;
    costs += orderCost(order, state);
  }
  return {
    key: bucket.key,
    label: bucket.label,
    sales,
    orders,
    costs,
    expenses: 0,
  };
}

function aggregate(buckets: RangeBucket[]): {
  sales: number;
  orders: number;
  costs: number;
  expenses: number;
} {
  return buckets.reduce(
    (acc, b) => ({
      sales: acc.sales + b.sales,
      orders: acc.orders + b.orders,
      costs: acc.costs + b.costs,
      expenses: acc.expenses + b.expenses,
    }),
    { sales: 0, orders: 0, costs: 0, expenses: 0 },
  );
}

function aggregateInWindow(
  state: AppState,
  start: Date,
  end: Date,
): { sales: number; orders: number; costs: number; expenses: number } {
  let sales = 0;
  let orders = 0;
  let costs = 0;
  for (const order of state.orders) {
    if (!isCompletedSale(order)) continue;
    const created = parseISO(order.createdAt);
    if (!isWithinInterval(created, { start, end })) continue;
    sales += order.total;
    orders += 1;
    costs += orderCost(order, state);
  }
  return { sales, orders, costs, expenses: 0 };
}

function buildTopProducts(
  state: AppState,
  start: Date,
  end: Date,
): StatisticsData["topProducts"] {
  const map = new Map<string, { name: string; value: number; quantity: number }>();
  for (const order of state.orders) {
    if (!isCompletedSale(order)) continue;
    const created = parseISO(order.createdAt);
    if (!isWithinInterval(created, { start, end })) continue;
    for (const item of order.items) {
      const existing = map.get(item.productId);
      if (existing) {
        existing.value += item.total;
        existing.quantity += item.quantity;
      } else {
        map.set(item.productId, {
          name: item.productNameAr,
          value: item.total,
          quantity: item.quantity,
        });
      }
    }
  }
  return [...map.entries()]
    .map(([, data]) => data)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

function buildStatusMix(state: AppState): StatisticsData["statusMix"] {
  const active = state.orders.filter((o) => o.deletedAt === null);
  return ORDER_STATUSES.filter((s) => s.index >= 0).map((s) => ({
    label: s.labelAr,
    value: active.filter((o) => o.status === s.key).length,
    color: STATUS_COLOR_HEX[s.color] ?? "#3D2B1F",
  }));
}

/**
 * Computes all statistics-series for the given time range from the live store.
 * Pure derived data — same sources as dashboard.service (orders/products).
 */
export function useStatisticsData(
  state: AppState,
  range: TimeRange,
): StatisticsData {
  return useMemo(() => {
    const now = new Date();
    const window = rangeWindow(range, now);
    const buckets = buildBuckets(range, now, state);

    const cur = aggregate(buckets);
    const prev =
      range === "all"
        ? { sales: 0, orders: 0, costs: 0, expenses: 0 }
        : aggregateInWindow(state, window.prevStart, window.prevEnd);

    const curAvg = cur.orders > 0 ? cur.sales / cur.orders : 0;
    const prevAvg = prev.orders > 0 ? prev.sales / prev.orders : 0;
    const curProfit = cur.sales - cur.costs - cur.expenses;
    const prevProfit = prev.sales - prev.costs - prev.expenses;

    const salesSpark = buckets.map((b) => b.sales);
    const ordersSpark = buckets.map((b) => b.orders);
    const avgOrderSpark = buckets.map((b) =>
      b.orders > 0 ? b.sales / b.orders : 0,
    );
    const profitSpark = buckets.map((b) => b.sales - b.costs - b.expenses);

    const topProducts = buildTopProducts(state, window.start, window.end);
    const statusMix = buildStatusMix(state);

    const hasSales = cur.sales > 0;
    const hasOrders = cur.orders > 0 || statusMix.some((s) => s.value > 0);

    return {
      range,
      buckets,
      kpis: {
        sales: cur.sales,
        salesDelta: range === "all" ? null : pctChange(cur.sales, prev.sales),
        orders: cur.orders,
        ordersDelta:
          range === "all" ? null : pctChange(cur.orders, prev.orders),
        avgOrder: curAvg,
        avgOrderDelta:
          range === "all" ? null : pctChange(curAvg, prevAvg),
        profit: curProfit,
        profitDelta:
          range === "all" ? null : pctChange(curProfit, prevProfit),
      },
      salesSpark,
      ordersSpark,
      avgOrderSpark,
      profitSpark,
      topProducts,
      statusMix,
      hasSales,
      hasOrders,
    };
  }, [state, range]);
}

export const TIME_RANGE_OPTIONS: Array<{ key: TimeRange; label: string }> = [
  { key: "today", label: "اليوم" },
  { key: "7d", label: "7 أيام" },
  { key: "30d", label: "30 يوم" },
  { key: "all", label: "الكل" },
];

export function rangeDescription(range: TimeRange): string {
  switch (range) {
    case "today":
      return "مبيعات اليوم حسب الساعة";
    case "7d":
      return "آخر 7 أيام";
    case "30d":
      return "آخر 30 يوماً";
    case "all":
      return "كل الفترات";
  }
}

// Re-export for the toggle component without a circular import.
export type { OrderStatus };
