"use client";

import { useCallback, useEffect, useState } from "react";
import { CloudOff, CloudUpload, Radio, RotateCcw } from "lucide-react";

import {
  getFailedSyncCount,
  getPendingSyncCount,
  retryFailedSyncItems,
  subscribeSyncQueue,
  wakePendingSyncItems,
} from "@/lib/offline/db";
import { flushOfflineSyncQueue } from "@/lib/offline/sync";
import { useAppHydrationStatus } from "@/hooks/use-app-hydration";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useRealtimeStatus } from "@/hooks/use-realtime-status";
import { cn } from "@/lib/utils";

export function OfflineIndicator({ className }: { className?: string }) {
  const online = useOnlineStatus();
  const realtime = useRealtimeStatus();
  const hydration = useAppHydrationStatus();
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(0);
  const [busy, setBusy] = useState(false);
  const initialSync = hydration === "syncing";

  const refresh = useCallback(async () => {
    const [pendingCount, failedCount] = await Promise.all([
      getPendingSyncCount(),
      getFailedSyncCount(),
    ]);
    setPending(pendingCount);
    setFailed(failedCount);
  }, []);

  useEffect(() => {
    void refresh();
    const unsubscribe = subscribeSyncQueue(() => {
      void refresh();
    });
    const id = window.setInterval(() => {
      void refresh();
    }, 2_000);
    return () => {
      unsubscribe();
      window.clearInterval(id);
    };
  }, [online, refresh]);

  const retry = async () => {
    if (!online || busy) return;
    setBusy(true);
    try {
      if (failed > 0) await retryFailedSyncItems();
      await wakePendingSyncItems();
      await flushOfflineSyncQueue().catch(() => 0);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void retry()}
      disabled={!online || busy}
      aria-live="polite"
      aria-label={
        failed > 0
          ? `إعادة محاولة ${failed} عملية مزامنة`
          : online
            ? pending > 0
              ? `مزامنة، ${pending} معلّق`
              : "حالة المزامنة"
            : "وضع عدم الاتصال"
      }
      className={cn(
        "flex min-h-8 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default",
        failed > 0
          ? "bg-destructive/10 text-destructive"
          : online && realtime === "connected"
            ? "bg-pistachio-400/15 text-pistachio-400"
            : online
              ? "bg-gold-400/15 text-gold-500"
            : "bg-caramel-500/15 text-caramel-500",
        className,
      )}
    >
      {failed > 0 ? (
        <>
          <RotateCcw
            className={cn("size-3.5", busy && "animate-spin")}
            aria-hidden
          />
          <span>تعذرت المزامنة ({failed})</span>
        </>
      ) : online ? (
        initialSync ? (
          <>
            <CloudUpload className="size-3.5 animate-pulse" aria-hidden />
            <span>تحديث البيانات</span>
          </>
        ) : realtime === "connected" && pending === 0 ? (
          <>
            <Radio className="size-3.5" aria-hidden />
            <span>مزامنة فورية</span>
          </>
        ) : (
          <>
            <CloudUpload
              className={cn("size-3.5", busy && "animate-pulse")}
              aria-hidden
            />
            <span>
              {busy
                ? "جاري المزامنة"
                : realtime === "degraded"
                  ? "إعادة الاتصال"
                  : "مزامنة"}{" "}
              {pending > 0 ? `(${pending})` : ""}
            </span>
          </>
        )
      ) : (
        <>
          <CloudOff className="size-3.5" aria-hidden />
          <span>وضع عدم الاتصال</span>
        </>
      )}
    </button>
  );
}
