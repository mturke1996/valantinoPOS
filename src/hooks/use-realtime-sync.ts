"use client";

import { useEffect, useRef } from "react";

import type { AuthSession } from "@/lib/auth";
import { hydrateStoreFromSupabase } from "@/lib/data/hydrate";
import { getProtectedEntityIds } from "@/lib/data/merge-snapshot";
import { refreshSystemReminders } from "@/lib/data/store";
import { flushOfflineSyncQueue } from "@/lib/offline/sync";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const DEBOUNCE_MS = 400;
const SYNC_FLUSH_MS = 5_000;
const REMINDER_MS = 60_000;

const REALTIME_TABLES = [
  "products",
  "batches",
  "orders",
  "payments",
  "shifts",
  "customers",
  "user_profiles",
  "categories",
  "events",
  "returns",
  "discounts",
  "coupons",
  "suppliers",
  "expenses",
  "purchase_orders",
  "invoices",
  "inventory_movements",
  "loyalty_tiers",
  "settings",
] as const;

export function useRealtimeSync(session: AuthSession | null, enabled: boolean) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  useEffect(() => {
    if (!enabled || !session?.branchId || !isSupabaseConfigured()) return;

    const supabase = createClient();
    if (!supabase) return;

    const refresh = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const current = sessionRef.current;
        if (!current) return;
        void flushOfflineSyncQueue().then(async () => {
          const protectedIds = await getProtectedEntityIds();
          const ok = await hydrateStoreFromSupabase(current, { protectedIds });
          if (!ok) {
            console.warn("[realtime] hydrate failed — will retry on next event");
          }
        });
      }, DEBOUNCE_MS);
    };

    let channel = supabase.channel(`branch-live-${session.branchId}`);

    for (const table of REALTIME_TABLES) {
      channel = channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `branch_id=eq.${session.branchId}`,
        },
        refresh,
      );
    }

    channel.subscribe();

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
      void supabase.removeChannel(channel);
    };
  }, [enabled, session?.branchId]);
}
