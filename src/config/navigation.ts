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
    searchKeywords: ["products", "منتجات", "فئات"],
  },
  {
    label: "المخزون",
    href: "/inventory",
    icon: "ClipboardList",
    roles: ["admin", "warehouse"],
    searchKeywords: ["inventory", "مخزون", "دفعات", "fefo"],
  },
  {
    label: "الموردون",
    href: "/suppliers",
    icon: "Truck",
    roles: ["admin", "warehouse", "accountant"],
    searchKeywords: ["suppliers", "موردون"],
  },
  {
    label: "المشتريات",
    href: "/purchases",
    icon: "ShoppingBag",
    roles: ["admin", "warehouse", "accountant"],
    searchKeywords: ["purchases", "مشتريات", "استلام"],
  },
  {
    label: "المصروفات",
    href: "/expenses",
    icon: "Wallet",
    roles: ["admin", "accountant"],
    searchKeywords: ["expenses", "مصروفات"],
  },
  {
    label: "الفواتير",
    href: "/invoices",
    icon: "Receipt",
    roles: ["admin", "accountant", "sales"],
    searchKeywords: ["invoices", "فواتير", "مدفوعات"],
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
  const normalizedPath = pathname === "/" ? "/dashboard" : pathname;
  const item = NAV_ITEMS.find(
    (candidate) =>
      normalizedPath === candidate.href ||
      normalizedPath.startsWith(`${candidate.href}/`),
  );
  return item ? canAccessNavItem(item, userRole) : true;
}

export function getDefaultPathForRole(
  userRole: UserRole | undefined,
): string {
  return getNavItemsForRole(userRole)[0]?.href ?? "/login";
}
