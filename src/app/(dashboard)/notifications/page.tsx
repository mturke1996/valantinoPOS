"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  BellRing,
  CalendarClock,
  CheckCheck,
  Package,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useStoreSubscription } from "@/hooks/use-store-subscription";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/data/store";
import { cn, formatDateTime } from "@/lib/utils";
import type { Notification } from "@/types";

const TYPE_LABELS: Record<string, string> = {
  order: "طلب",
  stock: "مخزون",
  event: "مناسبة / توصيل",
  system: "نظام",
};

const TYPE_ICONS = {
  order: ShoppingBag,
  stock: Package,
  event: CalendarClock,
  system: Bell,
} as const;

type FilterKey = "all" | "unread" | "order" | "event" | "stock";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [browserPermission, setBrowserPermission] =
    useState<NotificationPermission>(() =>
      typeof window !== "undefined" && "Notification" in window
        ? Notification.permission
        : "denied",
    );

  const sync = useCallback(() => {
    setNotifications(getNotifications());
    setLoading(false);
  }, []);

  useStoreSubscription(sync);

  const markAllRead = () => {
    markAllNotificationsRead();
  };

  const markRead = (id: string) => {
    markNotificationRead(id);
  };

  const enableDeviceNotifications = async () => {
    if (!("Notification" in window)) {
      toast.error("هذا المتصفح لا يدعم إشعارات الجهاز");
      return;
    }
    const permission = await Notification.requestPermission();
    setBrowserPermission(permission);
    if (permission === "granted") {
      toast.success("تم تفعيل تنبيهات المناسبات والتجهيز على الجهاز");
    } else {
      toast.error("لم يتم السماح بالإشعارات من المتصفح");
    }
  };

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (filter === "unread") return !n.readAt;
      if (filter === "all") return true;
      return n.type === filter;
    });
  }, [notifications, filter]);

  if (loading) {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-5 py-4">
      <PageHeader
        title="الإشعارات"
        description={
          unreadCount > 0
            ? `${unreadCount} غير مقروء`
            : "كل الإشعارات مقروءة"
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {browserPermission !== "granted" ? (
              <Button
                variant="outline"
                className="min-h-11 gap-2"
                onClick={() => void enableDeviceNotifications()}
              >
                <BellRing className="size-4" />
                تفعيل إشعارات الجهاز
              </Button>
            ) : (
              <Badge variant="secondary" className="min-h-11 gap-2 px-3">
                <BellRing className="size-4" />
                إشعارات الجهاز مفعلة
              </Badge>
            )}
            {unreadCount > 0 ? (
            <Button
              variant="outline"
              className="min-h-11 gap-2"
              onClick={markAllRead}
            >
              <CheckCheck className="size-4" />
              تعليم الكل
            </Button>
            ) : null}
          </div>
        }
      />

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {(
          [
            { key: "all", label: "الكل" },
            { key: "unread", label: "غير مقروء" },
            { key: "event", label: "مناسبات" },
            { key: "order", label: "طلبات" },
            { key: "stock", label: "مخزون" },
          ] as const
        ).map(({ key, label }) => (
          <Button
            key={key}
            type="button"
            size="sm"
            variant={filter === key ? "default" : "outline"}
            className="min-h-10 shrink-0"
            onClick={() => setFilter(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="لا توجد إشعارات"
          description="ستظهر هنا تنبيهات الطلبات والمناسبات والتوصيل والمخزون"
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => {
            const Icon = TYPE_ICONS[n.type as keyof typeof TYPE_ICONS] ?? Bell;
            const content = (
              <div
                className={cn(
                  "flex min-h-[4.5rem] items-start gap-3 rounded-xl border px-3 py-3 transition-colors active:bg-cacao-800/5 sm:gap-4 sm:px-4",
                  n.readAt
                    ? "border-cacao-800/6 opacity-75"
                    : "border-gold-400/25 bg-gold-400/5",
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-lg",
                    n.readAt ? "bg-cacao-800/8" : "bg-gold-400/15 text-gold-500",
                  )}
                >
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium leading-snug">{n.title}</p>
                    <Badge variant="outline" className="text-[10px]">
                      {TYPE_LABELS[n.type] ?? n.type}
                    </Badge>
                    {!n.readAt ? (
                      <span className="size-2 rounded-full bg-gold-400" />
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">
                    {n.body}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatDateTime(n.createdAt)}
                    {n.link ? " · اضغط للفتح" : ""}
                  </p>
                </div>
              </div>
            );

            if (n.link) {
              return (
                <Link
                  key={n.id}
                  href={n.link}
                  onClick={() => {
                    if (!n.readAt) markRead(n.id);
                  }}
                  className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={n.id}
                type="button"
                className="w-full text-start"
                onClick={() => {
                  if (!n.readAt) markRead(n.id);
                }}
              >
                {content}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
