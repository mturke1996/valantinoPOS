"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

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
import { formatDateTime } from "@/lib/utils";
import type { Notification } from "@/types";

const TYPE_LABELS: Record<string, string> = {
  order: "طلب",
  stock: "مخزون",
  event: "مناسبة / تذكير",
  system: "نظام",
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

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

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  if (loading) {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      <PageHeader
        title="الإشعارات والتذكيرات"
        description={`${unreadCount} غير مقروء — تذكيرات 7 أيام / 3 أيام / غداً / ساعتين / 30 دقيقة قبل الموعد`}
        actions={
          unreadCount > 0 ? (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              تعليم الكل كمقروء
            </Button>
          ) : undefined
        }
      />

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="لا توجد إشعارات"
          description="ستظهر هنا تنبيهات الطلبات الجديدة والمخزون المنخفض وتذكيرات التسليم"
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              role="button"
              tabIndex={0}
              onClick={() => !n.readAt && markRead(n.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !n.readAt) markRead(n.id);
              }}
              className={`flex items-start gap-4 rounded-lg border px-4 py-3 transition-colors ${
                n.readAt
                  ? "border-cacao-800/6 opacity-70"
                  : "cursor-pointer border-gold-400/20 bg-gold-400/5 hover:bg-gold-400/10"
              }`}
            >
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-cacao-800/8">
                <Bell className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{n.title}</p>
                  <Badge variant="outline" className="text-[10px]">
                    {TYPE_LABELS[n.type] ?? n.type}
                  </Badge>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>{formatDateTime(n.createdAt)}</span>
                  {n.link ? (
                    <Link
                      href={n.link}
                      className="text-gold-500 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      عرض التفاصيل
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
