"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import {
  setAppHydrationBootStep,
  setAppHydrationStatus,
  useAppHydrationBoot,
} from "@/hooks/use-app-hydration";
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

function BootScreen({
  label,
  progress,
  error,
  onRetry,
}: {
  label: string;
  progress: number;
  error?: boolean;
  onRetry?: () => void;
}) {
  return (
    <div className="flex h-svh items-center justify-center bg-background px-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
        <div className="size-10 animate-pulse rounded-xl bg-cacao-800/15" />
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-cacao-800 dark:text-cream-50">
            {error ? "تعذّر تحميل المنظومة" : "جاري تحميل المنظومة بالكامل…"}
          </p>
          <p className="text-xs text-muted-foreground">
            {error ? "تحقق من الاتصال ثم أعد المحاولة" : label}
          </p>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-cacao-800/10">
          <div
            className="h-full rounded-full bg-gold-400 transition-[width] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
            style={{ width: `${error ? 100 : Math.max(8, progress)}%` }}
          />
        </div>
        {error && onRetry ? (
          <Button type="button" onClick={onRetry}>
            إعادة المحاولة
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const boot = useAppHydrationBoot();

  const cached = readCachedSession();
  const [authSession, setAuthSession] = useState<AuthSession | null>(
    () => cached,
  );
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
  const [sessionChecked, setSessionChecked] = useState(false);
  const [bootReady, setBootReady] = useState(false);
  const [bootError, setBootError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  const appReady = bootReady && !bootError;
  useRealtimeSync(authSession, appReady && sessionChecked);
  useBrowserNotifications(appReady);

  useEffect(() => {
    let active = true;

    const bootApp = async () => {
      setBootReady(false);
      setBootError(false);
      setAppHydrationBootStep("session");
      setAppHydrationStatus("syncing");

      const local = getAuthSession();
      if (local) {
        setAuthSession(local);
        setUserRole(local.role);
        setUserName(local.name);
      }

      const session = await getVerifiedSupabaseSession();
      if (!active) return;

      if (!session) {
        clearAuthSession();
        setAppHydrationStatus("idle");
        setSessionChecked(true);
        setBootReady(false);
        router.replace("/login");
        return;
      }

      setUserRole(session.role);
      setUserName(session.name);
      setAuthSession(session);

      const ok = await hydrateStoreFromSupabase(session, {
        onProgress: (step) => {
          if (active) setAppHydrationBootStep(step);
        },
      });

      if (!active) return;

      if (!ok) {
        setBootError(true);
        setAppHydrationStatus("error");
        setSessionChecked(true);
        return;
      }

      setAppHydrationBootStep("reminders");
      refreshSystemReminders();
      const state = getState();
      setNotificationCount(
        state.notifications.filter((n) => !n.readAt).length,
      );
      setAppHydrationBootStep("done");
      setAppHydrationStatus("ready");
      setBootReady(true);
      setSessionChecked(true);
    };

    void bootApp();
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
  }, [router, retryToken]);

  const isPos = pathname === "/pos";
  const isFullscreen = isPos;
  const hasRouteAccess = canAccessPath(pathname, userRole);

  useEffect(() => {
    if (appReady && sessionChecked && userRole && !hasRouteAccess) {
      router.replace(getDefaultPathForRole(userRole));
    }
  }, [appReady, hasRouteAccess, router, sessionChecked, userRole]);

  if (bootError) {
    return (
      <BootScreen
        label={boot.label}
        progress={boot.progress}
        error
        onRetry={() => setRetryToken((value) => value + 1)}
      />
    );
  }

  if (!appReady) {
    return <BootScreen label={boot.label} progress={boot.progress} />;
  }

  if (sessionChecked && userRole && !hasRouteAccess) {
    return (
      <BootScreen label="التحقق من الصلاحيات…" progress={95} />
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
