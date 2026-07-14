"use client";

import { useEffect, useRef } from "react";

import { getState, subscribe } from "@/lib/data/store";

const MAX_NOTIFICATION_AGE_MS = 5 * 60 * 1000;

export function useBrowserNotifications(enabled: boolean): void {
  const knownIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const current = getState();
    const cutoff = Date.now() - MAX_NOTIFICATION_AGE_MS;
    knownIds.current = new Set(
      current.notifications
        .filter(
          (notification) =>
            new Date(notification.createdAt).getTime() < cutoff,
        )
        .map((notification) => notification.id),
    );

    const showNewNotifications = (state: ReturnType<typeof getState>) => {
      if (!("Notification" in window) || Notification.permission !== "granted") {
        return;
      }

      const now = Date.now();
      for (const notification of state.notifications) {
        if (knownIds.current.has(notification.id)) continue;
        knownIds.current.add(notification.id);
        if (notification.readAt) continue;
        if (
          now - new Date(notification.createdAt).getTime() >
          MAX_NOTIFICATION_AGE_MS
        ) {
          continue;
        }

        const options: NotificationOptions = {
          body: notification.body,
          icon: "/icon",
          badge: "/icon",
          tag: notification.dedupKey ?? notification.id,
          data: { url: notification.link ?? "/notifications" },
          dir: "rtl",
          lang: "ar",
        };

        if ("serviceWorker" in navigator) {
          void navigator.serviceWorker.ready
            .then((registration) =>
              registration.showNotification(notification.title, options),
            )
            .catch(() => undefined);
        } else {
          const browserNotification = new Notification(
            notification.title,
            options,
          );
          browserNotification.onclick = () => {
            window.focus();
            window.location.href = notification.link ?? "/notifications";
          };
        }
      }
    };

    const unsubscribe = subscribe(showNewNotifications);
    showNewNotifications(current);
    return unsubscribe;
  }, [enabled]);
}
