"use client";

import { useEffect, useRef } from "react";

import type { AuthSession } from "@/lib/auth";
import { hydrateStoreFromSupabase } from "@/lib/data/hydrate";
import { getProtectedEntityIds } from "@/lib/data/merge-snapshot";
import { refreshSystemReminders } from "@/lib/data/store";
import { flushOfflineSyncQueue } from "@/lib/offline/sync";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const DEBOUNCE_MS = 800;

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
          await hydrateStoreFromSupabase(current, { protectedIds });
        });
      }, DEBOUNCE_MS);
    };

    const channel = supabase
      .channel(`branch-live-${session.branchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
          filter: `branch_id=eq.${session.branchId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "batches",
          filter: `branch_id=eq.${session.branchId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `branch_id=eq.${session.branchId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payments",
          filter: `branch_id=eq.${session.branchId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shifts",
          filter: `branch_id=eq.${session.branchId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "customers",
          filter: `branch_id=eq.${session.branchId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_profiles",
          filter: `branch_id=eq.${session.branchId}`,
        },
        refresh,
      )
      .subscribe();

    const fastFlush = window.setInterval(() => {
      refreshSystemReminders();
      void flushOfflineSyncQueue().catch(() => undefined);
    }, 5_000);

    refreshSystemReminders();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.clearInterval(fastFlush);
      void supabase.removeChannel(channel);
    };
  }, [enabled, session?.branchId]);
}
