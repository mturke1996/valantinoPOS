"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { setAppHydrationStatus } from "@/hooks/use-app-hydration";
import { useBrowserNotifications } from "@/hooks/use-browser-notifications";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { getState, refreshSystemReminders, subscribe } from "@/lib/data/store";
import { hydrateStoreFromSupabase } from "@/lib/data/hydrate";
import {
  clearAuthSession,
  getAuthSession,
  getVerifiedSupabaseSession,
  type AuthSession,
} from "@/lib/auth";
import {
  canAccessPath,
  getDefaultPathForRole,
  type UserRole,
} from "@/config/navigation";

function readCachedSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  return getAuthSession();
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const cached = readCachedSession();
  const [authSession, setAuthSession] = useState<AuthSession | null>(
    () => cached,
  );
  // Never default to admin — use cached role only
  const [userRole, setUserRole] = useState<UserRole | undefined>(
    () => cached?.role,
  );
  const [userName, setUserName] = useState<string>(
    () => cached?.name ?? "مستخدم",
  );
  const [notificationCount, setNotificationCount] = useState(() => {
    if (typeof window === "undefined") return 0;
    try {
      return getState().notifications.filter((n) => !n.readAt).length;
    } catch {
      return 0;
    }
  });
  const [mounted, setMounted] = useState(() => Boolean(cached));
  const [sessionChecked, setSessionChecked] = useState(false);

  useRealtimeSync(authSession, mounted && sessionChecked);
  useBrowserNotifications(mounted);

  useEffect(() => {
    let active = true;

    const boot = async () => {
      const local = getAuthSession();
      if (local) {
        setAuthSession(local);
        setUserRole(local.role);
        setUserName(local.name);
        setMounted(true);
        setAppHydrationStatus("syncing");
      }

      const session = await getVerifiedSupabaseSession();
      if (!active) return;

      if (!session) {
        clearAuthSession();
        setAppHydrationStatus("idle");
        setSessionChecked(true);
        setMounted(false);
        router.replace("/login");
        return;
      }

      setUserRole(session.role);
      setUserName(session.name);
      setAuthSession(session);
      getAuthSession();
      setMounted(true);
      setAppHydrationStatus("syncing");

      try {
        await hydrateStoreFromSupabase(session);
        if (!active) return;
        refreshSystemReminders();
        const state = getState();
        setNotificationCount(
          state.notifications.filter((n) => !n.readAt).length,
        );
        setAppHydrationStatus("ready");
      } catch {
        if (!active) return;
        setAppHydrationStatus("error");
      } finally {
        if (active) setSessionChecked(true);
      }
    };

    void boot();
    const unsubscribe = subscribe(() => {
      const state = getState();
      setNotificationCount(
        state.notifications.filter((n) => !n.readAt).length,
      );
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [router]);

  const isPos = pathname === "/pos";
  const isFullscreen = isPos;
  const hasRouteAccess = canAccessPath(pathname, userRole);

  useEffect(() => {
    if (mounted && sessionChecked && userRole && !hasRouteAccess) {
      router.replace(getDefaultPathForRole(userRole));
    }
  }, [hasRouteAccess, mounted, router, sessionChecked, userRole]);

  if (!mounted) {
    return (
      <div className="flex h-svh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-pulse rounded-md bg-cacao-800/20" />
          <p className="text-xs text-muted-foreground">جاري فتح المنظومة…</p>
        </div>
      </div>
    );
  }

  if (sessionChecked && userRole && !hasRouteAccess) {
    return (
      <div className="flex h-svh items-center justify-center bg-background">
        <div className="size-8 animate-pulse rounded-md bg-cacao-800/20" />
      </div>
    );
  }

  return (
    <AppShell
      userRole={userRole}
      userName={userName}
      notificationCount={notificationCount}
      fullscreen={isFullscreen}
    >
      {children}
    </AppShell>
  );
}
