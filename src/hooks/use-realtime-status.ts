"use client";

import { useSyncExternalStore } from "react";

export type RealtimeSyncStatus =
  | "disabled"
  | "connecting"
  | "connected"
  | "degraded";

let status: RealtimeSyncStatus = "disabled";
const listeners = new Set<() => void>();

export function setRealtimeSyncStatus(next: RealtimeSyncStatus): void {
  if (status === next) return;
  status = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): RealtimeSyncStatus {
  return status;
}

function getServerSnapshot(): RealtimeSyncStatus {
  return "disabled";
}

export function useRealtimeStatus(): RealtimeSyncStatus {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
