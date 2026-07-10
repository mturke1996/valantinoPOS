"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [userRole, setUserRole] = useState<UserRole>("admin");
  const [userName, setUserName] = useState<string>("مدير النظام");
  const [notificationCount, setNotificationCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);

  useRealtimeSync(authSession, mounted);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      const session = await getVerifiedSupabaseSession();

      if (!active) return;
      if (!session) {
        clearAuthSession();
        router.replace("/login");
        return;
      }

      setUserRole(session.role);
      setUserName(session.name);
      setAuthSession(session);
      getAuthSession();

      await hydrateStoreFromSupabase(session);
      refreshSystemReminders();
      const state = getState();
      setNotificationCount(
        state.notifications.filter((n) => !n.readAt).length,
      );
      setMounted(true);
    };

    void hydrate();
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
    if (mounted && !hasRouteAccess) {
      router.replace(getDefaultPathForRole(userRole));
    }
  }, [hasRouteAccess, mounted, router, userRole]);

  if (!mounted || !hasRouteAccess) {
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
