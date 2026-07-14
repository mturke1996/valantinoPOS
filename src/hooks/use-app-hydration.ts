"use client";

import { useSyncExternalStore } from "react";

export type AppHydrationStatus = "idle" | "syncing" | "ready" | "error";

let status: AppHydrationStatus = "idle";
const listeners = new Set<() => void>();

export function setAppHydrationStatus(next: AppHydrationStatus): void {
  if (status === next) return;
  status = next;
  listeners.forEach((listener) => listener());
}

export function getAppHydrationStatus(): AppHydrationStatus {
  return status;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppHydrationStatus(): AppHydrationStatus {
  return useSyncExternalStore(
    subscribe,
    getAppHydrationStatus,
    () => "idle" as const,
  );
}
