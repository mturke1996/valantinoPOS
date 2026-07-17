"use client";

import { formatDate } from "@/lib/utils";
import { DOC_INK } from "@/components/documents/brand";
import type { Event, Order, Settings } from "@/types";

const ORDER_TYPE_LABELS: Record<Order["type"], string> = {
  pos: "نقطة بيع",
  delivery: "توصيل",
  event: "مناسبة",
  reservation: "حجز",
  online: "أونلاين",
};

export function orderTypeLabel(order: Order, event?: Event | null): string {
  if (event) return "مناسبة";
  return ORDER_TYPE_LABELS[order.type] ?? order.type;
}

export function scheduleTitle(order: Order): string {
  if (order.type === "event") return "موعد المناسبة";
  if (order.type === "reservation") return "موعد الحجز";
  if (order.deliveryAddress) return "موعد التوصيل";
  return "الموعد";
}

interface DocScheduleBlockProps {
  order: Order;
  event?: Event | null;
  settings: Settings;
  compact?: boolean;
}

/**
 * Compact schedule block for HTML invoices.
 * Delivery fee is intentionally omitted — shown only in totals.
 */
export function DocScheduleBlock({
  order,
  event,
  settings: _settings,
  compact = false,
}: DocScheduleBlockProps) {
  const hasSchedule = Boolean(order.deliveryDate);
  const addressHint = [order.deliveryZone, order.deliveryAddress]
    .filter(Boolean)
    .join(" · ");

  if (!hasSchedule && !addressHint) return null;

  const dateLabel = order.deliveryDate
    ? formatDate(order.deliveryDate, "EEEE، d MMMM yyyy")
    : null;

  return (
    <div className={compact ? "space-y-1" : "space-y-1.5"}>
      {hasSchedule ? (
        <div
          className="overflow-hidden rounded-sm"
          style={{
            border: `1px solid ${DOC_INK.goldLine}`,
            background: DOC_INK.paleGold,
          }}
        >
          <div
            className={`flex items-center justify-between gap-2 ${compact ? "px-2 py-1" : "px-2.5 py-1"}`}
            style={{
              background: "rgba(204,168,80,0.12)",
              borderBottom: `1px solid ${DOC_INK.goldLine}`,
            }}
          >
            <span
              className={`font-bold ${compact ? "text-[9px]" : "text-[10px]"}`}
              style={{ color: DOC_INK.goldDeep }}
            >
              {scheduleTitle(order)}
            </span>
            <span
              className={`font-semibold ${compact ? "text-[8px]" : "text-[9px]"}`}
              style={{ color: DOC_INK.goldDeep }}
            >
              {orderTypeLabel(order, event)}
            </span>
          </div>
          <div className={`${compact ? "px-2 py-1" : "px-2.5 py-1.5"}`}>
            <p
              className={`font-bold leading-snug ${compact ? "text-[11px]" : "text-[12px]"}`}
              style={{ color: DOC_INK.text }}
            >
              {dateLabel}
              {order.deliveryTime ? ` · ${order.deliveryTime}` : ""}
            </p>
            {addressHint ? (
              <p
                className={`mt-0.5 ${compact ? "text-[8px]" : "text-[9px]"}`}
                style={{ color: DOC_INK.muted }}
              >
                {addressHint}
              </p>
            ) : null}
            {event?.guestCount ? (
              <p
                className={`mt-0.5 ${compact ? "text-[8px]" : "text-[9px]"}`}
                style={{ color: DOC_INK.muted }}
              >
                {event.guestCount} ضيف/قطعة
              </p>
            ) : null}
          </div>
        </div>
      ) : addressHint ? (
        <p
          className={compact ? "text-[8px]" : "text-[9px]"}
          style={{ color: DOC_INK.muted }}
        >
          {addressHint}
        </p>
      ) : null}
    </div>
  );
}
