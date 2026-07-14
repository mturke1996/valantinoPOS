"use client";

import { useEffect, useRef, useState } from "react";

import { getState, subscribe } from "@/lib/data/store";

/**
 * Re-run callback when local store changes.
 * Invokes once synchronously on first render so pages can drop skeleton flashes.
 */
export function useStoreSubscription(refresh: () => void): void {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  // Sync warm-start: fill page state before first paint when store is already local.
  useState(() => {
    getState();
    refresh();
    return true;
  });

  useEffect(() => {
    return subscribe(() => {
      refreshRef.current();
    });
  }, []);
}
