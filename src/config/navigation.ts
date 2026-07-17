export type UserRole =
  | "admin"
  | "cashier"
  | "sales"
  | "warehouse"
  | "accountant"
  | "delivery";

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles: UserRole[];
  searchKeywords?: string[];
}

export const ALL_ROLES: UserRole[] = [
  "admin",
  "cashier",
  "sales",
  "warehouse",
  "accountant",
  "delivery",
];

export const NAV_ITEMS: NavItem[] = [
  {
    label: "لوحة التحكم",
    href: "/dashboard",
    icon: "LayoutDashboard",
    roles: ["admin", "sales", "accountant", "warehouse"],
    searchKeywords: ["dashboard", "تحكم", "رئيسية"],
  },
  {
    label: "نقطة البيع",
    href: "/pos",
    icon: "ShoppingCart",
    roles: ["admin", "cashier"],
    searchKeywords: ["pos", "بيع", "كاشير"],
  },
  {
    label: "الورديات",
    href: "/shifts",
    icon: "Clock",
    roles: ["admin", "cashier", "accountant"],
    searchKeywords: ["shifts", "ورديات", "z-report"],
  },
  {
    label: "الطلبات",
    href: "/orders",
    icon: "Package",
    roles: ["admin", "sales", "cashier", "delivery"],
    searchKeywords: ["orders", "طلبات"],
  },
  {
    label: "الفواتير",
    href: "/invoices",
    icon: "Receipt",
    roles: ["admin", "accountant", "sales"],
    searchKeywords: ["invoices", "فواتير", "مدفوعات"],
  },
  {
    label: "المناسبات",
    href: "/events",
    icon: "PartyPopper",
    roles: ["admin", "sales"],
    searchKeywords: ["events", "مناسبات", "أعراس", "هدايا"],
  },
  {
    label: "تقويم التسليم",
    href: "/calendar",
    icon: "CalendarDays",
    roles: ["admin", "sales", "delivery"],
    searchKeywords: ["calendar", "تقويم", "تسليم"],
  },
  {
    label: "العملاء",
    href: "/customers",
    icon: "Users",
    roles: ["admin", "sales", "cashier"],
    searchKeywords: ["customers", "عملاء", "ولاء"],
  },
  {
    label: "المنتجات",
    href: "/products",
    icon: "Tag",
    roles: ["admin", "warehouse", "sales"],
    searchKeywords: ["products", "منتجات", "فئات", "كتالوج"],
  },
  {
    label: "المرتجعات",
    href: "/returns",
    icon: "Undo2",
    roles: ["admin", "cashier", "sales"],
    searchKeywords: ["returns", "مرتجعات", "استرداد"],
  },
  {
    label: "الخصومات والكوبونات",
    href: "/discounts",
    icon: "Percent",
    roles: ["admin", "sales"],
    searchKeywords: ["discounts", "خصومات", "كوبونات"],
  },
  {
    label: "التقارير",
    href: "/reports",
    icon: "FileBarChart",
    roles: ["admin", "accountant"],
    searchKeywords: ["reports", "تقارير"],
  },
  {
    label: "الإحصائيات",
    href: "/statistics",
    icon: "BarChart3",
    roles: ["admin", "accountant", "sales"],
    searchKeywords: ["statistics", "إحصائيات", "تحليلات"],
  },
  {
    label: "الإشعارات",
    href: "/notifications",
    icon: "Bell",
    roles: ALL_ROLES,
    searchKeywords: ["notifications", "إشعارات", "تنبيهات"],
  },
  {
    label: "الموظفون",
    href: "/staff",
    icon: "UserCog",
    roles: ["admin"],
    searchKeywords: ["staff", "موظفون", "صلاحيات"],
  },
  {
    label: "سجل النشاط",
    href: "/audit",
    icon: "ScrollText",
    roles: ["admin"],
    searchKeywords: ["audit", "سجل", "نشاط"],
  },
  {
    label: "الإعدادات",
    href: "/settings",
    icon: "Settings",
    roles: ["admin"],
    searchKeywords: ["settings", "إعدادات", "فروع"],
  },
];

export function canAccessNavItem(
  item: NavItem,
  userRole: UserRole | undefined,
): boolean {
  if (!userRole) return false;
  return item.roles.includes(userRole);
}

export function getNavItemsForRole(userRole: UserRole | undefined): NavItem[] {
  if (!userRole) return [];
  return NAV_ITEMS.filter((item) => canAccessNavItem(item, userRole));
}

export function canAccessPath(
  pathname: string,
  userRole: UserRole | undefined,
): boolean {
  if (!userRole) return false;
  const normalizedPath = pathname === "/" ? "/dashboard" : pathname;
  // Removed screens — allow old bookmarks for roles that used them.
  if (
    normalizedPath === "/suppliers" ||
    normalizedPath.startsWith("/suppliers/") ||
    normalizedPath === "/purchases" ||
    normalizedPath.startsWith("/purchases/") ||
    normalizedPath === "/expenses" ||
    normalizedPath.startsWith("/expenses/") ||
    normalizedPath === "/inventory" ||
    normalizedPath.startsWith("/inventory/")
  ) {
    return (
      canAccessPath("/products", userRole) ||
      canAccessPath("/reports", userRole) ||
      canAccessPath("/dashboard", userRole)
    );
  }
  if (
    normalizedPath === "/kitchen" ||
    normalizedPath.startsWith("/kitchen/")
  ) {
    return canAccessPath("/orders", userRole);
  }
  const item = NAV_ITEMS.find(
    (candidate) =>
      normalizedPath === candidate.href ||
      normalizedPath.startsWith(`${candidate.href}/`),
  );
  // Default deny — unknown dashboard routes must be added to NAV_ITEMS.
  return item ? canAccessNavItem(item, userRole) : false;
}

export function getDefaultPathForRole(
  userRole: UserRole | undefined,
): string {
  return getNavItemsForRole(userRole)[0]?.href ?? "/login";
}
