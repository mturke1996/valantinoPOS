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

const ORDER_TYPE_LABELS: Record<Order["type"], string> = {
  pos: "بيع فوري",
  delivery: "توصيل",
  event: "مناسبة",
  reservation: "حجز",
  online: "أونلاين",
};

/** Shared labels — safe for PDF + WhatsApp (no "use client"). */
export function orderTypeLabel(order: Order, event?: Event | null): string {
  if (order.type === "event" && event) {
    return EVENT_LABELS[event.eventType] ?? "مناسبة";
  }
  return ORDER_TYPE_LABELS[order.type] ?? order.type;
}

export function scheduleTitle(order: Order): string {
  if (order.type === "event") return "موعد المناسبة";
  if (order.type === "reservation") return "موعد الحجز";
  if (order.deliveryAddress) return "موعد التوصيل";
  return "موعد الاستلام";
}
