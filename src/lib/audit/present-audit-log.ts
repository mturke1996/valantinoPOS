import {
  format,
  isToday,
  isYesterday,
  parseISO,
  startOfDay,
} from "date-fns";
import { ar } from "date-fns/locale";

import {
  getAuditActionMeta,
  getAuditEntityLabel,
  type AuditCategory,
} from "@/lib/constants/audit";
import { getOrderStatusConfig } from "@/lib/constants/order-status";
import { formatMoneyLabel } from "@/lib/formatters";
import { formatDateTime } from "@/lib/utils";
import type { AppState, AuditLog, OrderStatus, Settings } from "@/types";

const PAYMENT_METHOD_AR: Record<string, string> = {
  cash: "نقدي",
  card: "بطاقة",
  transfer: "تحويل",
  credit: "رصيد",
};

export interface PresentedAuditLog {
  id: string;
  createdAt: string;
  action: string;
  actionLabel: string;
  category: Exclude<AuditCategory, "all">;
  tone: ReturnType<typeof getAuditActionMeta>["tone"];
  icon: ReturnType<typeof getAuditActionMeta>["icon"];
  entityType: string;
  entityTypeLabel: string;
  entityId: string;
  entityLabel: string;
  title: string;
  summary: string;
  actorName: string;
  timeLabel: string;
  dayKey: string;
  dayLabel: string;
  detailRows: { label: string; oldValue?: string; newValue?: string }[];
  searchText: string;
}

function asString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function money(value: unknown, settings: Settings): string | null {
  const n = asNumber(value);
  return n == null ? null : formatMoneyLabel(n, settings);
}

function statusLabel(value: unknown): string | null {
  const key = asString(value);
  if (!key) return null;
  return getOrderStatusConfig(key as OrderStatus)?.labelAr ?? key;
}

function boolLabel(value: unknown): string | null {
  if (typeof value !== "boolean") return null;
  return value ? "نشط" : "معطّل";
}

function shortId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

function resolveEntityLabel(
  log: AuditLog,
  state: AppState,
): string {
  const { entityType, entityId, newValues, oldValues } = log;

  if (entityType === "order") {
    const fromValues =
      asString(newValues?.orderNumber) ?? asString(oldValues?.orderNumber);
    if (fromValues) return fromValues;
    const order = state.orders.find((o) => o.id === entityId);
    return order?.orderNumber ?? shortId(entityId);
  }

  if (entityType === "product") {
    const fromValues =
      asString(newValues?.nameAr) ?? asString(oldValues?.nameAr);
    if (fromValues) return fromValues;
    const product = state.products.find((p) => p.id === entityId);
    return product?.nameAr ?? asString(newValues?.sku) ?? shortId(entityId);
  }

  if (entityType === "customer") {
    const fromValues = asString(newValues?.name) ?? asString(oldValues?.name);
    if (fromValues) return fromValues;
    const customer = state.customers.find((c) => c.id === entityId);
    return customer?.name ?? shortId(entityId);
  }

  if (entityType === "category") {
    const fromValues =
      asString(newValues?.nameAr) ?? asString(oldValues?.nameAr);
    if (fromValues) return fromValues;
    const category = state.categories.find((c) => c.id === entityId);
    return category?.nameAr ?? shortId(entityId);
  }

  if (entityType === "return") {
    const fromValues =
      asString(newValues?.returnNumber) ?? asString(oldValues?.returnNumber);
    if (fromValues) return fromValues;
    const ret = state.returns.find((r) => r.id === entityId);
    return ret?.returnNumber ?? shortId(entityId);
  }

  if (entityType === "payment") {
    const orderId = asString(newValues?.orderId) ?? asString(oldValues?.orderId);
    if (orderId) {
      const order = state.orders.find((o) => o.id === orderId);
      if (order) return order.orderNumber;
    }
    return `دفعة ${shortId(entityId)}`;
  }

  if (entityType === "shift") {
    return `وردية ${shortId(entityId)}`;
  }

  if (entityType === "batch") {
    return asString(newValues?.batchNumber) ?? `دفعة ${shortId(entityId)}`;
  }

  return shortId(entityId);
}

function buildSummary(
  log: AuditLog,
  entityLabel: string,
  settings: Settings,
): string {
  const nv = log.newValues ?? {};
  const ov = log.oldValues ?? {};

  switch (log.action) {
    case "order.create": {
      const total = money(nv.total, settings);
      return total
        ? `تم إنشاء الطلب ${entityLabel} بإجمالي ${total}`
        : `تم إنشاء الطلب ${entityLabel}`;
    }
    case "order.update_status": {
      const from = statusLabel(ov.status);
      const to = statusLabel(nv.status);
      if (from && to) return `${entityLabel}: ${from} ← ${to}`;
      if (to) return `${entityLabel}: أصبحت إلى ${to}`;
      return `تحديث حالة ${entityLabel}`;
    }
    case "order.update":
      return `تم تعديل تفاصيل الطلب ${entityLabel}`;
    case "order.cancel":
      return `تم إلغاء الطلب ${entityLabel}`;
    case "payment.process": {
      const method =
        PAYMENT_METHOD_AR[asString(nv.method) ?? ""] ?? asString(nv.method);
      const paid = money(nv.paidAmount, settings);
      const parts = [`دفعة على ${entityLabel}`];
      if (paid) parts.push(paid);
      if (method) parts.push(`(${method})`);
      return parts.join(" · ");
    }
    case "product.create": {
      const price = money(nv.retailPrice, settings);
      return price
        ? `إضافة المنتج ${entityLabel} بسعر ${price}`
        : `إضافة المنتج ${entityLabel}`;
    }
    case "product.update": {
      const bits: string[] = [];
      if (asString(ov.sku) !== asString(nv.sku) && nv.sku != null) {
        bits.push(`SKU: ${asString(nv.sku)}`);
      }
      const oldPrice = money(ov.retailPrice, settings);
      const newPrice = money(nv.retailPrice, settings);
      if (oldPrice && newPrice && oldPrice !== newPrice) {
        bits.push(`السعر ${oldPrice} ← ${newPrice}`);
      }
      const oldActive = boolLabel(ov.isActive);
      const newActive = boolLabel(nv.isActive);
      if (oldActive && newActive && oldActive !== newActive) {
        bits.push(newActive);
      }
      return bits.length > 0
        ? `تعديل ${entityLabel} · ${bits.join(" · ")}`
        : `تعديل بيانات ${entityLabel}`;
    }
    case "category.create":
      return `إضافة التصنيف ${entityLabel}`;
    case "customer.create": {
      const phone = asString(nv.phone);
      return phone
        ? `إضافة العميل ${entityLabel} · ${phone}`
        : `إضافة العميل ${entityLabel}`;
    }
    case "customer.update": {
      const phone = asString(nv.phone);
      return phone
        ? `تحديث بيانات ${entityLabel} · ${phone}`
        : `تحديث بيانات ${entityLabel}`;
    }
    case "inventory.receive": {
      const qty = asNumber(nv.quantity);
      return qty != null
        ? `استلام مخزون · ${qty} وحدة`
        : `استلام مخزون جديد`;
    }
    case "inventory.adjust": {
      const qty = asNumber(nv.quantity) ?? asNumber(nv.delta);
      return qty != null
        ? `تعديل مخزون ${entityLabel} · ${qty > 0 ? "+" : ""}${qty}`
        : `تعديل مخزون ${entityLabel}`;
    }
    case "shift.handover": {
      const counted = money(nv.countedCash, settings);
      const variance = money(nv.variance, settings);
      if (counted && variance) {
        return `تسليم درج · عُدّ ${counted} · الفرق ${variance}`;
      }
      if (counted) return `تسليم درج · عُدّ ${counted}`;
      return "تسليم وردية";
    }
    case "return.create": {
      const refund = money(nv.totalRefund, settings);
      return refund
        ? `مرتجع ${entityLabel} · استرداد ${refund}`
        : `إنشاء مرتجع ${entityLabel}`;
    }
    default:
      return `${getAuditActionMeta(log.action).labelAr} · ${entityLabel}`;
  }
}

function buildDetailRows(
  log: AuditLog,
  settings: Settings,
): PresentedAuditLog["detailRows"] {
  const nv = log.newValues ?? {};
  const ov = log.oldValues ?? {};
  const rows: PresentedAuditLog["detailRows"] = [];

  const push = (
    label: string,
    oldRaw: unknown,
    newRaw: unknown,
    format?: (v: unknown) => string | null,
  ) => {
    const fmt = format ?? ((v: unknown) => asString(v));
    const oldValue = fmt(oldRaw) ?? undefined;
    const newValue = fmt(newRaw) ?? undefined;
    if (!oldValue && !newValue) return;
    if (oldValue === newValue && oldValue) {
      rows.push({ label, newValue });
      return;
    }
    rows.push({ label, oldValue, newValue });
  };

  const moneyFmt = (v: unknown) => money(v, settings);
  const statusFmt = (v: unknown) => statusLabel(v);
  const methodFmt = (v: unknown) => {
    const key = asString(v);
    if (!key) return null;
    return PAYMENT_METHOD_AR[key] ?? key;
  };
  const boolFmt = (v: unknown) => boolLabel(v);

  switch (log.action) {
    case "order.create":
      push("رقم الطلب", null, nv.orderNumber);
      push("الإجمالي", null, nv.total, moneyFmt);
      break;
    case "order.update_status":
    case "order.cancel":
      push("الحالة", ov.status, nv.status, statusFmt);
      break;
    case "payment.process":
      push("المدفوع", ov.paidAmount, nv.paidAmount, moneyFmt);
      push("الطريقة", null, nv.method, methodFmt);
      break;
    case "product.create":
      push("الاسم", null, nv.nameAr);
      push("SKU", null, nv.sku);
      push("السعر", null, nv.retailPrice, moneyFmt);
      break;
    case "product.update":
      push("SKU", ov.sku, nv.sku);
      push("السعر", ov.retailPrice, nv.retailPrice, moneyFmt);
      push("الحالة", ov.isActive, nv.isActive, boolFmt);
      break;
    case "category.create":
      push("الاسم", null, nv.nameAr);
      push("المعرّف", null, nv.slug);
      break;
    case "customer.create":
    case "customer.update":
      push("الاسم", ov.name, nv.name);
      push("الهاتف", ov.phone, nv.phone);
      break;
    case "inventory.receive":
      push("الكمية", null, nv.quantity);
      push("التكلفة", null, nv.costPrice ?? nv.unitCost, moneyFmt);
      break;
    case "inventory.adjust":
      push("الكمية", null, nv.quantity ?? nv.delta);
      push("السبب", null, nv.reason ?? nv.notes);
      break;
    case "shift.handover":
      push("المتوقع", ov.expectedCash, null, moneyFmt);
      push("رصيد الافتتاح", ov.openingFloat, null, moneyFmt);
      push("المعدود", null, nv.countedCash, moneyFmt);
      push("الفرق", null, nv.variance, moneyFmt);
      push("ملاحظات", null, nv.notes);
      break;
    case "return.create":
      push("رقم المرتجع", null, nv.returnNumber);
      push("الاسترداد", null, nv.totalRefund, moneyFmt);
      break;
    default: {
      const keys = new Set([
        ...Object.keys(ov),
        ...Object.keys(nv),
      ]);
      for (const key of keys) {
        push(key, ov[key], nv[key]);
      }
    }
  }

  return rows;
}

function dayLabelFor(date: Date): { dayKey: string; dayLabel: string } {
  const dayKey = format(startOfDay(date), "yyyy-MM-dd");
  if (isToday(date)) return { dayKey, dayLabel: "اليوم" };
  if (isYesterday(date)) return { dayKey, dayLabel: "أمس" };
  return {
    dayKey,
    dayLabel: format(date, "EEEE d MMMM yyyy", { locale: ar }),
  };
}

export function presentAuditLog(
  log: AuditLog,
  state: AppState,
): PresentedAuditLog {
  const meta = getAuditActionMeta(log.action);
  const entityLabel = resolveEntityLabel(log, state);
  const actor =
    log.userId == null
      ? "النظام"
      : (state.users.find((u) => u.id === log.userId)?.fullName ?? "موظف");
  const created = parseISO(log.createdAt);
  const { dayKey, dayLabel } = dayLabelFor(created);
  const summary = buildSummary(log, entityLabel, state.settings);
  const detailRows = buildDetailRows(log, state.settings);

  return {
    id: log.id,
    createdAt: log.createdAt,
    action: log.action,
    actionLabel: meta.labelAr,
    category: meta.category,
    tone: meta.tone,
    icon: meta.icon,
    entityType: log.entityType,
    entityTypeLabel: getAuditEntityLabel(log.entityType),
    entityId: log.entityId,
    entityLabel,
    title: meta.labelAr,
    summary,
    actorName: actor,
    timeLabel: formatDateTime(log.createdAt, "HH:mm"),
    dayKey,
    dayLabel,
    detailRows,
    searchText: [
      meta.labelAr,
      summary,
      entityLabel,
      actor,
      log.action,
      log.entityType,
      log.entityId,
      getAuditEntityLabel(log.entityType),
    ]
      .join(" ")
      .toLowerCase(),
  };
}

export function presentAuditLogs(
  logs: AuditLog[],
  state: AppState,
): PresentedAuditLog[] {
  return logs
    .slice()
    .sort(
      (a, b) =>
        parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime(),
    )
    .map((log) => presentAuditLog(log, state));
}

export function groupPresentedAuditLogs(
  items: PresentedAuditLog[],
): { dayKey: string; dayLabel: string; items: PresentedAuditLog[] }[] {
  const groups = new Map<
    string,
    { dayKey: string; dayLabel: string; items: PresentedAuditLog[] }
  >();

  for (const item of items) {
    const existing = groups.get(item.dayKey);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.set(item.dayKey, {
        dayKey: item.dayKey,
        dayLabel: item.dayLabel,
        items: [item],
      });
    }
  }

  return Array.from(groups.values());
}

export function computeAuditStats(items: PresentedAuditLog[]) {
  const todayKey = format(startOfDay(new Date()), "yyyy-MM-dd");
  let today = 0;
  let orders = 0;
  let payments = 0;
  let inventory = 0;

  for (const item of items) {
    if (item.dayKey === todayKey) today += 1;
    if (item.category === "orders") orders += 1;
    if (item.category === "payments") payments += 1;
    if (item.category === "inventory") inventory += 1;
  }

  return {
    total: items.length,
    today,
    orders,
    payments,
    inventory,
  };
}
