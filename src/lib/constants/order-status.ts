import type { OrderStatus } from "@/types";

export interface OrderStatusConfig {
  key: OrderStatus;
  labelAr: string;
  labelEn: string;
  index: number;
  color: string;
  isTerminal: boolean;
}

/** 8 pipeline stages (index 0–7) + cancelled (index -1) */
export const ORDER_STATUSES: readonly OrderStatusConfig[] = [
  {
    key: "received",
    labelAr: "مستلم",
    labelEn: "Received",
    index: 0,
    color: "caramel",
    isTerminal: false,
  },
  {
    key: "reviewing",
    labelAr: "قيد المراجعة",
    labelEn: "Reviewing",
    index: 1,
    color: "caramel",
    isTerminal: false,
  },
  {
    key: "preparing",
    labelAr: "قيد التحضير",
    labelEn: "Preparing",
    index: 2,
    color: "cacao",
    isTerminal: false,
  },
  {
    key: "packaging",
    labelAr: "قيد التغليف",
    labelEn: "Packaging",
    index: 3,
    color: "cacao",
    isTerminal: false,
  },
  {
    key: "ready",
    labelAr: "جاهز",
    labelEn: "Ready",
    index: 4,
    color: "pistachio",
    isTerminal: false,
  },
  {
    key: "out_for_delivery",
    labelAr: "في الطريق",
    labelEn: "Out for Delivery",
    index: 5,
    color: "pistachio",
    isTerminal: false,
  },
  {
    key: "delivered",
    labelAr: "تم التسليم",
    labelEn: "Delivered",
    index: 6,
    color: "gold",
    isTerminal: false,
  },
  {
    key: "completed",
    labelAr: "مكتمل",
    labelEn: "Completed",
    index: 7,
    color: "gold",
    isTerminal: true,
  },
  {
    key: "cancelled",
    labelAr: "ملغي",
    labelEn: "Cancelled",
    index: -1,
    color: "berry",
    isTerminal: true,
  },
] as const;

export const PIPELINE_STATUSES = ORDER_STATUSES.filter((s) => s.index >= 0);

export function getOrderStatusConfig(
  status: OrderStatus,
): OrderStatusConfig | undefined {
  return ORDER_STATUSES.find((s) => s.key === status);
}

export function getNextOrderStatus(
  current: OrderStatus,
): OrderStatus | null {
  if (current === "cancelled" || current === "completed") return null;
  const config = getOrderStatusConfig(current);
  if (!config || config.index < 0) return null;
  const next = PIPELINE_STATUSES.find((s) => s.index === config.index + 1);
  return next?.key ?? null;
}

export function isValidStatusTransition(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  if (to === "cancelled") return from !== "completed" && from !== "cancelled";
  if (from === "cancelled" || from === "completed") return false;
  const fromConfig = getOrderStatusConfig(from);
  const toConfig = getOrderStatusConfig(to);
  if (!fromConfig || !toConfig || toConfig.index < 0) return false;
  return toConfig.index === fromConfig.index + 1;
}
