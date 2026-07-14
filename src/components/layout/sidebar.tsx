"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  CalendarDays,
  ClipboardList,
  Clock,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  Package,
  PartyPopper,
  Percent,
  Receipt,
  ScrollText,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Tag,
  Truck,
  Undo2,
  UserCog,
  Users,
  Wallet,
  PanelRightClose,
  PanelRightOpen,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import {
  canAccessNavItem,
  getNavItemsForRole,
  type NavItem,
  type UserRole,
} from "@/config/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { logout } from "@/lib/auth";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  ShoppingCart,
  Clock,
  Package,
  PartyPopper,
  CalendarDays,
  Users,
  Tag,
  ClipboardList,
  Truck,
  ShoppingBag,
  Wallet,
  Receipt,
  Undo2,
  Percent,
  FileBarChart,
  BarChart3,
  Bell,
  UserCog,
  ScrollText,
  Settings,
};

function NavIcon({ name }: { name: string }) {
  const Icon = ICON_MAP[name] ?? Package;
  return (
    <Icon className="size-[18px] shrink-0" strokeWidth={1.75} aria-hidden />
  );
}

export interface SidebarProps {
  userRole?: UserRole;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  onClose?: () => void;
  className?: string;
}

function NavLink({
  item,
  collapsed,
  isActive,
}: {
  item: NavItem;
  collapsed: boolean;
  isActive: boolean;
}) {
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-200",
        "hover:bg-cacao-800/[0.04] dark:hover:bg-cacao-800/30",
        isActive
          ? "bg-cacao-800/[0.06] text-cacao-800 dark:bg-cacao-800/40 dark:text-cream-50"
          : "text-cacao-800/70 dark:text-cream-100/70",
      )}
    >
      {isActive ? (
        <span
          aria-hidden
          className="absolute inset-y-2 start-0 w-0.5 rounded-full bg-gold-400"
        />
      ) : null}
      <NavIcon name={item.icon} />
      {!collapsed ? (
        <span className="truncate">{item.label}</span>
      ) : null}
    </Link>
  );
}

export function Sidebar({
  userRole,
  collapsed: controlledCollapsed,
  onCollapsedChange,
  onClose,
  className,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = controlledCollapsed ?? internalCollapsed;

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const setCollapsed = (value: boolean) => {
    if (onCollapsedChange) {
      onCollapsedChange(value);
    } else {
      setInternalCollapsed(value);
    }
  };

  const visibleItems = getNavItemsForRole(userRole);
  const primaryItems = visibleItems.filter(
    (item) => !["staff", "audit", "settings"].includes(item.href.slice(1)),
  );
  const settingsItems = visibleItems.filter((item) =>
    ["/staff", "/audit", "/settings"].includes(item.href),
  );

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <aside
      aria-label="القائمة الجانبية"
      className={cn(
        "flex h-full shrink-0 flex-col border-s border-cacao-800/8 bg-background transition-[width] duration-300 ease-spring motion-reduce:transition-none",
        collapsed ? "w-[72px]" : "w-64",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center border-b border-cacao-800/8 px-4",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        {!collapsed ? (
          <>
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <span className="flex h-10 w-36 items-center justify-center px-1">
                <Image
                  src="/images/valentino-logo.png"
                  alt="Valentino Chocolate"
                  width={144}
                  height={48}
                  priority
                  className="h-auto w-full object-contain"
                />
              </span>
            </Link>
            {onClose ? (
              <Button
                variant="ghost"
                size="icon"
                className="size-9"
                onClick={onClose}
                aria-label="إغلاق القائمة"
              >
                <X className="size-4" />
              </Button>
            ) : null}
          </>
        ) : (
          <Link
            href="/dashboard"
            className="flex size-10 items-center justify-center"
            title="Valentino"
          >
            <Image
              src="/images/valentino-logo.png"
              alt="Valentino"
              width={40}
              height={40}
              className="h-9 w-9 object-cover object-[18%_45%]"
            />
          </Link>
        )}
      </div>

      <nav aria-label="التنقل الرئيسي" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {primaryItems.map((item) =>
          canAccessNavItem(item, userRole) ? (
            <NavLink
              key={item.href}
              item={item}
              collapsed={collapsed}
              isActive={isActive(item.href)}
            />
          ) : null,
        )}

        {settingsItems.length > 0 ? (
          <>
            <Separator className="my-3 bg-cacao-800/8" />
            {settingsItems.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                collapsed={collapsed}
                isActive={isActive(item.href)}
              />
            ))}
          </>
        ) : null}
      </nav>

      <div className="space-y-1 border-t border-cacao-800/8 p-3">
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          className={cn(
            "w-full text-berry-600 hover:bg-berry-500/10 hover:text-berry-600 dark:text-berry-400",
            !collapsed && "justify-start gap-2",
          )}
          onClick={handleLogout}
          aria-label="خروج"
        >
          <LogOut className="size-4" />
          {!collapsed ? <span>خروج</span> : null}
        </Button>
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          className={cn(
            "w-full text-cacao-800/70 hover:bg-cacao-800/[0.04] hover:text-cacao-800 dark:text-cream-100/70",
            !collapsed && "justify-start gap-2",
            onClose && "hidden",
          )}
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "توسيع القائمة" : "طي القائمة"}
        >
          {collapsed ? (
            <PanelRightOpen className="size-4" />
          ) : (
            <PanelRightClose className="size-4" />
          )}
          {!collapsed ? <span>طي القائمة</span> : null}
        </Button>
      </div>
    </aside>
  );
}
