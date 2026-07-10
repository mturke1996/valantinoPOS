"use client";

import { useEffect } from "react";

import { getState, subscribe } from "@/lib/data/store";

/** Re-run callback when local store changes (and once on mount). */
export function useStoreSubscription(refresh: () => void): void {
  useEffect(() => {
    getState();
    refresh();
    return subscribe(refresh);
  }, [refresh]);
}
