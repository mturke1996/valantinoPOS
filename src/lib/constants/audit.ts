import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  CreditCard,
  Package,
  PackageMinus,
  PackagePlus,
  Pencil,
  RotateCcw,
  ShoppingBag,
  Tags,
  UserPlus,
  UserRound,
  Wallet,
  XCircle,
} from "lucide-react";

export type AuditCategory =
  | "all"
  | "orders"
  | "payments"
  | "inventory"
  | "customers"
  | "catalog"
  | "shifts"
  | "returns";

export type AuditTone = "neutral" | "success" | "warning" | "danger" | "info";

export interface AuditActionMeta {
  labelAr: string;
  category: Exclude<AuditCategory, "all">;
  tone: AuditTone;
  icon: LucideIcon;
}

export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  order: "طلب",
  payment: "دفعة",
  product: "منتج",
  category: "تصنيف",
  customer: "عميل",
  batch: "دفعة مخزون",
  shift: "وردية",
  return: "مرتجع",
};

export const AUDIT_ACTION_META: Record<string, AuditActionMeta> = {
  "order.create": {
    labelAr: "إنشاء طلب",
    category: "orders",
    tone: "success",
    icon: ShoppingBag,
  },
  "order.update_status": {
    labelAr: "تحديث حالة الطلب",
    category: "orders",
    tone: "info",
    icon: ArrowLeftRight,
  },
  "order.update": {
    labelAr: "تعديل الطلب",
    category: "orders",
    tone: "info",
    icon: Pencil,
  },
  "order.cancel": {
    labelAr: "إلغاء طلب",
    category: "orders",
    tone: "danger",
    icon: XCircle,
  },
  "payment.process": {
    labelAr: "تسجيل دفعة",
    category: "payments",
    tone: "success",
    icon: CreditCard,
  },
  "product.create": {
    labelAr: "إضافة منتج",
    category: "catalog",
    tone: "success",
    icon: PackagePlus,
  },
  "product.update": {
    labelAr: "تعديل منتج",
    category: "catalog",
    tone: "neutral",
    icon: Package,
  },
  "category.create": {
    labelAr: "إضافة تصنيف",
    category: "catalog",
    tone: "success",
    icon: Tags,
  },
  "customer.create": {
    labelAr: "إضافة عميل",
    category: "customers",
    tone: "success",
    icon: UserPlus,
  },
  "customer.update": {
    labelAr: "تعديل عميل",
    category: "customers",
    tone: "neutral",
    icon: UserRound,
  },
  "inventory.receive": {
    labelAr: "استلام مخزون",
    category: "inventory",
    tone: "success",
    icon: PackagePlus,
  },
  "inventory.adjust": {
    labelAr: "تعديل مخزون",
    category: "inventory",
    tone: "warning",
    icon: PackageMinus,
  },
  "shift.handover": {
    labelAr: "تسليم وردية",
    category: "shifts",
    tone: "info",
    icon: Wallet,
  },
  "return.create": {
    labelAr: "إنشاء مرتجع",
    category: "returns",
    tone: "warning",
    icon: RotateCcw,
  },
};

export const AUDIT_CATEGORY_FILTERS: {
  key: AuditCategory;
  label: string;
}[] = [
  { key: "all", label: "الكل" },
  { key: "orders", label: "الطلبات" },
  { key: "payments", label: "المدفوعات" },
  { key: "inventory", label: "المخزون" },
  { key: "customers", label: "العملاء" },
  { key: "catalog", label: "المنتجات" },
  { key: "shifts", label: "الورديات" },
  { key: "returns", label: "المرتجعات" },
];

export const AUDIT_TONE_STYLES: Record<
  AuditTone,
  { icon: string; badge: string; dot: string }
> = {
  neutral: {
    icon: "bg-cacao-800/8 text-cacao-800",
    badge: "border-cacao-800/15 bg-cacao-800/[0.04] text-cacao-800",
    dot: "bg-cacao-800/40",
  },
  success: {
    icon: "bg-pistachio-400/15 text-pistachio-400",
    badge: "border-pistachio-400/30 bg-pistachio-400/10 text-cacao-800",
    dot: "bg-pistachio-400",
  },
  warning: {
    icon: "bg-gold-400/15 text-gold-400",
    badge: "border-gold-400/35 bg-gold-400/10 text-cacao-800",
    dot: "bg-gold-400",
  },
  danger: {
    icon: "bg-berry-500/12 text-berry-500",
    badge: "border-berry-500/30 bg-berry-500/10 text-berry-500",
    dot: "bg-berry-500",
  },
  info: {
    icon: "bg-caramel-500/15 text-caramel-500",
    badge: "border-caramel-500/30 bg-caramel-500/10 text-cacao-800",
    dot: "bg-caramel-500",
  },
};

export function getAuditActionMeta(action: string): AuditActionMeta {
  return (
    AUDIT_ACTION_META[action] ?? {
      labelAr: action,
      category: "orders",
      tone: "neutral" as const,
      icon: ShoppingBag,
    }
  );
}

export function getAuditEntityLabel(entityType: string): string {
  return AUDIT_ENTITY_LABELS[entityType] ?? entityType;
}
