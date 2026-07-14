"use client";

import { useEffect, useRef } from "react";

import type { AuthSession } from "@/lib/auth";
import {
  hydrateStoreFromSupabase,
  REALTIME_TABLE_DOMAIN,
  type HydrateDomain,
} from "@/lib/data/hydrate";
import { getProtectedEntityIds } from "@/lib/data/merge-snapshot";
import { refreshSystemReminders } from "@/lib/data/store";
import { flushOfflineSyncQueue } from "@/lib/offline/sync";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { setRealtimeSyncStatus } from "@/hooks/use-realtime-status";

const DEBOUNCE_MS = 5_000;
const SYNC_FLUSH_MS = 8_000;
const REMINDER_MS = 60_000;
const FOCUS_MIN_GAP_MS = 60_000;
/** Minimum gap between hydrates of the same domain set */
const DOMAIN_MIN_GAP_MS = 4_000;

const REALTIME_TABLES = Object.keys(REALTIME_TABLE_DOMAIN);

export function useRealtimeSync(session: AuthSession | null, enabled: boolean) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRef = useRef(session);
  const lastHydrateAtRef = useRef(0);
  const skipNextSubscribeRefresh = useRef(true);
  const pendingDomainsRef = useRef<Set<HydrateDomain>>(new Set());
  sessionRef.current = session;

  useEffect(() => {
    if (!enabled || !session?.branchId || !isSupabaseConfigured()) {
      setRealtimeSyncStatus("disabled");
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setRealtimeSyncStatus("disabled");
      return;
    }

    setRealtimeSyncStatus("connecting");
    skipNextSubscribeRefresh.current = true;
    pendingDomainsRef.current.clear();

    const runHydrate = async (domains: HydrateDomain[], force = false) => {
      const current = sessionRef.current;
      if (!current) return;
      if (
        !force &&
        Date.now() - lastHydrateAtRef.current < DOMAIN_MIN_GAP_MS
      ) {
        return;
      }
      try {
        await flushOfflineSyncQueue();
        const protectedIds = await getProtectedEntityIds();
        const ok = await hydrateStoreFromSupabase(current, {
          protectedIds,
          domains,
        });
        lastHydrateAtRef.current = Date.now();
        if (!ok) {
          console.warn(
            "[realtime] hydrate failed — will retry on next event",
          );
        }
      } catch {
        console.warn("[realtime] hydrate threw — will retry on next event");
      }
    };

    const scheduleHydrate = (domain: HydrateDomain | "full", force = false) => {
      if (domain === "full") {
        for (const d of Object.values(REALTIME_TABLE_DOMAIN)) {
          pendingDomainsRef.current.add(d);
        }
      } else {
        pendingDomainsRef.current.add(domain);
      }
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const domains = Array.from(pendingDomainsRef.current);
        pendingDomainsRef.current.clear();
        if (domains.length === 0) return;
        void runHydrate(domains, force);
      }, DEBOUNCE_MS);
    };

    let channel = supabase.channel(`branch-live-${session.branchId}`);

    for (const table of REALTIME_TABLES) {
      const domain = REALTIME_TABLE_DOMAIN[table];
      if (!domain) continue;
      channel = channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `branch_id=eq.${session.branchId}`,
        },
        () => scheduleHydrate(domain, false),
      );
    }

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setRealtimeSyncStatus("connected");
        if (skipNextSubscribeRefresh.current) {
          skipNextSubscribeRefresh.current = false;
          lastHydrateAtRef.current = Date.now();
          return;
        }
        scheduleHydrate("full", true);
        return;
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        setRealtimeSyncStatus("degraded");
        return;
      }
      if (status === "CLOSED") {
        setRealtimeSyncStatus("connecting");
      }
    });

    const refreshWhenVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastHydrateAtRef.current < FOCUS_MIN_GAP_MS) return;
      scheduleHydrate("full", false);
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);

    const syncFlush = window.setInterval(() => {
      void flushOfflineSyncQueue().catch(() => undefined);
    }, SYNC_FLUSH_MS);

    const reminderTick = window.setInterval(() => {
      refreshSystemReminders();
    }, REMINDER_MS);

    refreshSystemReminders();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.clearInterval(syncFlush);
      window.clearInterval(reminderTick);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      setRealtimeSyncStatus("disabled");
      void supabase.removeChannel(channel);
    };
  }, [enabled, session?.branchId]);
}
