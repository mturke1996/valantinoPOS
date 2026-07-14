"use client";

import { DOC_INK, formatDocMoney } from "@/components/documents/brand";
import { formatDate } from "@/lib/utils";
import type { Event, Order, Settings } from "@/types";

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

const ORDER_TYPE_LABELS: Record<string, string> = {
  pos: "بيع فوري",
  delivery: "توصيل",
  event: "مناسبة",
  reservation: "حجز",
  online: "أونلاين",
};

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

interface DocScheduleBlockProps {
  order: Order;
  event?: Event | null;
  settings: Settings;
  compact?: boolean;
}

/** Prominent schedule + delivery details for PDF / A4 / A5 invoices */
export function DocScheduleBlock({
  order,
  event,
  settings,
  compact = false,
}: DocScheduleBlockProps) {
  const hasSchedule = Boolean(order.deliveryDate);
  const hasDelivery =
    Boolean(order.deliveryAddress) ||
    Boolean(order.deliveryZone) ||
    order.deliveryFee > 0 ||
    order.type === "delivery";

  if (!hasSchedule && !hasDelivery) return null;

  const dateLabel = order.deliveryDate
    ? formatDate(order.deliveryDate, "EEEE، d MMMM yyyy")
    : null;
  const shortDate = order.deliveryDate
    ? formatDate(order.deliveryDate, "dd/MM/yyyy")
    : null;

  return (
    <div className={compact ? "space-y-2.5" : "space-y-3"}>
      {hasSchedule ? (
        <div
          className={`overflow-hidden rounded-sm ${compact ? "" : ""}`}
          style={{
            border: `1px solid ${DOC_INK.goldLine}`,
            background: DOC_INK.paleGold,
          }}
        >
          <div
            className={`flex items-center justify-between gap-2 ${compact ? "px-3 py-1.5" : "px-4 py-2"}`}
            style={{
              background: "rgba(204,168,80,0.12)",
              borderBottom: `1px solid ${DOC_INK.goldLine}`,
            }}
          >
            <span
              className={`font-extrabold tracking-wide ${compact ? "text-[10px]" : "text-[11px]"}`}
              style={{ color: DOC_INK.goldDeep }}
            >
              {scheduleTitle(order)}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 font-bold ${compact ? "text-[9px]" : "text-[10px]"}`}
              style={{
                background: DOC_INK.white,
                color: DOC_INK.goldDeep,
                border: `1px solid ${DOC_INK.goldLine}`,
              }}
            >
              {orderTypeLabel(order, event)}
            </span>
          </div>

          <div
            className={`grid items-center gap-3 ${compact ? "grid-cols-[1fr_auto] px-3 py-2.5" : "grid-cols-[1fr_auto] px-4 py-3.5"}`}
          >
            <div className="min-w-0">
              <p
                className={`font-extrabold leading-snug ${compact ? "text-[14px]" : "text-[18px]"}`}
                style={{ color: DOC_INK.text }}
              >
                {dateLabel}
              </p>
              <p
                className={`mt-1 tabular-nums ${compact ? "text-[10px]" : "text-[12px]"}`}
                style={{ color: DOC_INK.muted }}
              >
                {shortDate}
                {event?.guestCount
                  ? ` · ${event.guestCount} ضيف/قطعة`
                  : ""}
              </p>
            </div>
            <div
              className={`shrink-0 rounded-sm text-center ${compact ? "min-w-[64px] px-2 py-1.5" : "min-w-[84px] px-3 py-2"}`}
              style={{
                background: DOC_INK.white,
                border: `1.5px solid ${DOC_INK.gold}`,
              }}
            >
              <p
                className={`font-extrabold tracking-wide ${compact ? "text-[9px]" : "text-[10px]"}`}
                style={{ color: DOC_INK.goldDeep }}
              >
                الساعة
              </p>
              <p
                className={`mt-0.5 font-extrabold tabular-nums ${compact ? "text-[15px]" : "text-[20px]"}`}
                dir="ltr"
                style={{ color: DOC_INK.text }}
              >
                {order.deliveryTime || "—"}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {hasDelivery ? (
        <div
          className={`rounded-sm ${compact ? "px-3 py-2.5" : "px-4 py-3"}`}
          style={{
            border: `1px solid ${DOC_INK.border}`,
            background: DOC_INK.zebra,
          }}
        >
          <p
            className={`mb-2 font-extrabold ${compact ? "text-[10px]" : "text-[11px]"}`}
            style={{ color: DOC_INK.goldDeep }}
          >
            تفاصيل التوصيل
          </p>
          <div
            className={`grid gap-x-4 gap-y-2 ${compact ? "grid-cols-2 text-[10px]" : "grid-cols-2 text-[12px] sm:grid-cols-3"}`}
          >
            {order.deliveryRecipientName ? (
              <Meta
                label="المستلم"
                value={order.deliveryRecipientName}
                compact={compact}
              />
            ) : null}
            {order.deliveryPhone ? (
              <Meta
                label="الهاتف"
                value={order.deliveryPhone}
                compact={compact}
                ltr
              />
            ) : null}
            {order.deliveryZone ? (
              <Meta
                label="المنطقة"
                value={order.deliveryZone}
                compact={compact}
              />
            ) : null}
            <Meta
              label="سعر التوصيل"
              value={
                order.deliveryFee > 0
                  ? formatDocMoney(order.deliveryFee, settings.currencySymbol)
                  : "مجاني"
              }
              compact={compact}
              emphasize
            />
            {order.deliveryAddress ? (
              <div className="col-span-2 sm:col-span-3">
                <Meta
                  label="مكان التوصيل"
                  value={order.deliveryAddress}
                  compact={compact}
                />
              </div>
            ) : null}
            {order.deliveryInstructions ? (
              <div className="col-span-2 sm:col-span-3">
                <Meta
                  label="تعليمات التوصيل"
                  value={order.deliveryInstructions}
                  compact={compact}
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Meta({
  label,
  value,
  compact,
  ltr,
  emphasize,
}: {
  label: string;
  value: string;
  compact?: boolean;
  ltr?: boolean;
  emphasize?: boolean;
}) {
  return (
    <div>
      <p
        className={`font-bold ${compact ? "text-[9px]" : "text-[10px]"}`}
        style={{ color: DOC_INK.faint }}
      >
        {label}
      </p>
      <p
        className={`mt-0.5 font-bold leading-snug ${compact ? "text-[11px]" : "text-[13px]"}`}
        dir={ltr ? "ltr" : undefined}
        style={{ color: emphasize ? DOC_INK.goldDeep : DOC_INK.text }}
      >
        {value}
      </p>
    </div>
  );
}
