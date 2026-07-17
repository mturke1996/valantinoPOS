"use client";

import { useSyncExternalStore } from "react";

export type AppHydrationStatus = "idle" | "syncing" | "ready" | "error";

import type { HydrateProgressStep } from "@/lib/data/hydrate";

export type HydrationBootStep = HydrateProgressStep;

const STEP_LABELS: Record<HydrationBootStep, string> = {
  session: "التحقق من الجلسة",
  settings: "تحميل الإعدادات",
  catalog: "تحميل المنتجات",
  commerce: "تحميل الطلبات والعملاء",
  ops: "تحميل العمليات",
  staff: "تحميل الموظفين",
  reminders: "تهيئة التنبيهات",
  done: "جاهز",
};

let status: AppHydrationStatus = "idle";
let bootStep: HydrationBootStep = "session";
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function setAppHydrationStatus(next: AppHydrationStatus): void {
  if (status === next) return;
  status = next;
  emit();
}

export function setAppHydrationBootStep(next: HydrationBootStep): void {
  if (bootStep === next) return;
  bootStep = next;
  emit();
}

export function getAppHydrationStatus(): AppHydrationStatus {
  return status;
}

export function getAppHydrationBootStep(): HydrationBootStep {
  return bootStep;
}

export function getAppHydrationBootLabel(): string {
  return STEP_LABELS[bootStep];
}

export function getAppHydrationProgress(): number {
  const order: HydrationBootStep[] = [
    "session",
    "settings",
    "catalog",
    "commerce",
    "ops",
    "staff",
    "reminders",
    "done",
  ];
  const index = order.indexOf(bootStep);
  return Math.round(((index + 1) / order.length) * 100);
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

export function useAppHydrationBoot(): {
  status: AppHydrationStatus;
  step: HydrationBootStep;
  label: string;
  progress: number;
} {
  const statusValue = useSyncExternalStore(
    subscribe,
    getAppHydrationStatus,
    () => "idle" as const,
  );
  const stepValue = useSyncExternalStore(
    subscribe,
    getAppHydrationBootStep,
    () => "session" as const,
  );
  return {
    status: statusValue,
    step: stepValue,
    label: STEP_LABELS[stepValue],
    progress: getAppHydrationProgress(),
  };
}
