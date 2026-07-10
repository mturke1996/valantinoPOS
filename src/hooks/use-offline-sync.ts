"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { flushOfflineSyncQueue } from "@/lib/offline/sync";
import { useOnlineStatus } from "@/hooks/use-online-status";

export function useOfflineSync() {
  const online = useOnlineStatus();
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      return;
    }

    const flush = async () => {
      try {
        const count = await flushOfflineSyncQueue();
        if (count > 0 && wasOffline.current) {
          toast.success(`تمت مزامنة ${count} عملية`);
        }
        wasOffline.current = false;
      } catch {
        // The queue retains failed work and retries with backoff.
      }
    };

    void flush();
    const interval = window.setInterval(() => {
      void flush();
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [online]);
}
