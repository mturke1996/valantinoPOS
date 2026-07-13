"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { wakePendingSyncItems } from "@/lib/offline/db";
import { flushOfflineSyncQueue } from "@/lib/offline/sync";
import { useOnlineStatus } from "@/hooks/use-online-status";

export function useOfflineSync() {
  const online = useOnlineStatus();
  const wasOffline = useRef(false);
  const didInitialWake = useRef(false);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      return;
    }

    const flush = async () => {
      try {
        if (wasOffline.current || !didInitialWake.current) {
          await wakePendingSyncItems();
          didInitialWake.current = true;
        }
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
    // Keep the queue draining while online — do not wait a full minute.
    const interval = window.setInterval(() => {
      void flush();
    }, 5_000);
    return () => window.clearInterval(interval);
  }, [online]);
}
