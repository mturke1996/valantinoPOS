"use client";

import { useSyncExternalStore } from "react";

type Listener = () => void;

const listeners = new Set<Listener>();
let online = true;
let started = false;
let intervalId: number | null = null;
let probeVersion = 0;

function publish(nextOnline: boolean) {
  if (online === nextOnline) return;
  online = nextOnline;
  listeners.forEach((listener) => listener());
}

async function probeConnectivity() {
  const version = ++probeVersion;
  if (!navigator.onLine) {
    publish(false);
    return;
  }

  try {
    const response = await fetch("/api/health", {
      method: "HEAD",
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (version === probeVersion) publish(response.ok);
  } catch {
    if (version === probeVersion) publish(false);
  }
}

function handleBrowserOnline() {
  // Optimistic: treat reconnect as online immediately so writes flush now.
  publish(true);
  void probeConnectivity();
}

function handleBrowserOffline() {
  probeVersion += 1;
  publish(false);
}

function handleVisibilityChange() {
  if (document.visibilityState === "visible") {
    void probeConnectivity();
  }
}

function startConnectivityMonitor() {
  if (started || typeof window === "undefined") return;
  started = true;
  online = navigator.onLine;
  window.addEventListener("online", handleBrowserOnline);
  window.addEventListener("offline", handleBrowserOffline);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  intervalId = window.setInterval(() => {
    void probeConnectivity();
  }, 30_000);
  void probeConnectivity();
}

function stopConnectivityMonitor() {
  if (!started || typeof window === "undefined") return;
  started = false;
  probeVersion += 1;
  window.removeEventListener("online", handleBrowserOnline);
  window.removeEventListener("offline", handleBrowserOffline);
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  if (intervalId !== null) window.clearInterval(intervalId);
  intervalId = null;
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  startConnectivityMonitor();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stopConnectivityMonitor();
  };
}

function getSnapshot() {
  return online;
}

function getServerSnapshot() {
  return true;
}

/** Imperative online check for non-React callers (store queue flush). */
export function isAppOnline(): boolean {
  if (typeof window === "undefined") return true;
  startConnectivityMonitor();
  // Prefer live browser signal for write-triggered flush; probe may lag.
  return navigator.onLine || online;
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
