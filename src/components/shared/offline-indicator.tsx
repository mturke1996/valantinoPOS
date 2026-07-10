"use client";

import { useCallback, useEffect, useState } from "react";
import { CloudOff, CloudUpload, RotateCcw } from "lucide-react";

import {
  getFailedSyncCount,
  getPendingSyncCount,
  retryFailedSyncItems,
} from "@/lib/offline/db";
import { flushOfflineSyncQueue } from "@/lib/offline/sync";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { cn } from "@/lib/utils";

export function OfflineIndicator() {
  const online = useOnlineStatus();
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(0);

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
    const id = window.setInterval(() => {
      void refresh();
    }, 5_000);
    return () => window.clearInterval(id);
  }, [online, refresh]);

  if (online && pending === 0 && failed === 0) return null;

  const retry = async () => {
    if (!online) return;
    if (failed > 0) await retryFailedSyncItems();
    await flushOfflineSyncQueue().catch(() => 0);
    await refresh();
  };

  return (
    <button
      type="button"
      onClick={() => void retry()}
      disabled={!online}
      aria-label={
        failed > 0
          ? `إعادة محاولة ${failed} عملية مزامنة`
          : "حالة المزامنة"
      }
      className={cn(
        "flex min-h-8 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default",
        failed > 0
          ? "bg-destructive/10 text-destructive"
          : online
          ? "bg-pistachio-400/15 text-pistachio-400"
          : "bg-caramel-500/15 text-caramel-500",
      )}
      role="status"
    >
      {failed > 0 ? (
        <>
          <RotateCcw className="size-3.5" />
          <span>تعذرت المزامنة ({failed})</span>
        </>
      ) : online ? (
        <>
          <CloudUpload className="size-3.5" />
          <span>مزامنة ({pending})</span>
        </>
      ) : (
        <>
          <CloudOff className="size-3.5" />
          <span>وضع عدم الاتصال</span>
        </>
      )}
    </button>
  );
}
