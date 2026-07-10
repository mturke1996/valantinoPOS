import type { RoleKey } from "@/types";

export type Permission =
  | "dashboard.read"
  | "pos.sell"
  | "pos.hold"
  | "pos.return"
  | "shifts.open"
  | "shifts.close"
  | "orders.read"
  | "orders.create"
  | "orders.update"
  | "orders.update_status"
  | "orders.delete"
  | "events.read"
  | "events.create"
  | "events.update"
  | "calendar.read"
  | "customers.read"
  | "customers.create"
  | "customers.update"
  | "customers.delete"
  | "products.read"
  | "products.create"
  | "products.update"
  | "products.delete"
  | "inventory.read"
  | "inventory.adjust"
  | "inventory.count"
  | "suppliers.read"
  | "suppliers.create"
  | "suppliers.update"
  | "purchases.read"
  | "purchases.create"
  | "purchases.receive"
  | "expenses.read"
  | "expenses.create"
  | "expenses.update"
  | "invoices.read"
  | "invoices.print"
  | "returns.read"
  | "returns.create"
  | "discounts.read"
  | "discounts.create"
  | "discounts.update"
  | "reports.read"
  | "statistics.read"
  | "notifications.read"
  | "staff.read"
  | "staff.create"
  | "staff.update"
  | "audit.read"
  | "settings.read"
  | "settings.update";

export interface RoleDefinition {
  key: RoleKey;
  nameAr: string;
  nameEn: string;
  description: string;
  permissions: readonly Permission[];
}

export const PERMISSIONS: readonly Permission[] = [
  "dashboard.read",
  "pos.sell",
  "pos.hold",
  "pos.return",
  "shifts.open",
  "shifts.close",
  "orders.read",
  "orders.create",
  "orders.update",
  "orders.update_status",
  "orders.delete",
  "events.read",
  "events.create",
  "events.update",
  "calendar.read",
  "customers.read",
  "customers.create",
  "customers.update",
  "customers.delete",
  "products.read",
  "products.create",
  "products.update",
  "products.delete",
  "inventory.read",
  "inventory.adjust",
  "inventory.count",
  "suppliers.read",
  "suppliers.create",
  "suppliers.update",
  "purchases.read",
  "purchases.create",
  "purchases.receive",
  "expenses.read",
  "expenses.create",
  "expenses.update",
  "invoices.read",
  "invoices.print",
  "returns.read",
  "returns.create",
  "discounts.read",
  "discounts.create",
  "discounts.update",
  "reports.read",
  "statistics.read",
  "notifications.read",
  "staff.read",
  "staff.create",
  "staff.update",
  "audit.read",
  "settings.read",
  "settings.update",
] as const;

export const ROLES: Record<RoleKey, RoleDefinition> = {
  manager: {
    key: "manager",
    nameAr: "مدير",
    nameEn: "Manager",
    description: "صلاحيات كاملة على الفرع والتقارير والإعدادات",
    permissions: PERMISSIONS,
  },
  cashier: {
    key: "cashier",
    nameAr: "كاشير",
    nameEn: "Cashier",
    description: "نقطة البيع والورديات والمرتجعات السريعة",
    permissions: [
      "dashboard.read",
      "pos.sell",
      "pos.hold",
      "pos.return",
      "shifts.open",
      "shifts.close",
      "orders.read",
      "orders.create",
      "customers.read",
      "customers.create",
      "products.read",
      "invoices.read",
      "invoices.print",
      "returns.read",
      "returns.create",
      "notifications.read",
    ],
  },
  sales: {
    key: "sales",
    nameAr: "مبيعات",
    nameEn: "Sales",
    description: "إدارة الطلبات والمناسبات والعملاء",
    permissions: [
      "dashboard.read",
      "orders.read",
      "orders.create",
      "orders.update",
      "orders.update_status",
      "events.read",
      "events.create",
      "events.update",
      "calendar.read",
      "customers.read",
      "customers.create",
      "customers.update",
      "products.read",
      "invoices.read",
      "discounts.read",
      "notifications.read",
    ],
  },
  warehouse: {
    key: "warehouse",
    nameAr: "مخزن",
    nameEn: "Warehouse",
    description: "جرد المخزون والدفعات واستلام المشتريات",
    permissions: [
      "dashboard.read",
      "products.read",
      "inventory.read",
      "inventory.adjust",
      "inventory.count",
      "suppliers.read",
      "purchases.read",
      "purchases.create",
      "purchases.receive",
      "notifications.read",
    ],
  },
  accountant: {
    key: "accountant",
    nameAr: "محاسب",
    nameEn: "Accountant",
    description: "فواتير ومصروفات وموردين وتقارير مالية",
    permissions: [
      "dashboard.read",
      "orders.read",
      "invoices.read",
      "invoices.print",
      "expenses.read",
      "expenses.create",
      "expenses.update",
      "suppliers.read",
      "suppliers.create",
      "suppliers.update",
      "purchases.read",
      "returns.read",
      "reports.read",
      "statistics.read",
      "audit.read",
      "notifications.read",
    ],
  },
  delivery: {
    key: "delivery",
    nameAr: "توصيل",
    nameEn: "Delivery",
    description: "متابعة الطلبات الجاهزة والتسليم",
    permissions: [
      "dashboard.read",
      "orders.read",
      "orders.update_status",
      "calendar.read",
      "customers.read",
      "notifications.read",
    ],
  },
};

export function hasPermission(
  roleKey: RoleKey,
  permission: Permission,
): boolean {
  return ROLES[roleKey].permissions.includes(permission);
}

export function getRolePermissions(roleKey: RoleKey): readonly Permission[] {
  return ROLES[roleKey].permissions;
}
