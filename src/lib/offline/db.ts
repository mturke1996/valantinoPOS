import Dexie, { type Table } from "dexie";

import type { Product } from "@/types";

export interface SyncQueueItem {
  id: string;
  action:
    | "create_order"
    | "process_payment"
    | "update_status"
    | "create_category"
    | "create_customer"
    | "update_customer"
    | "create_product"
    | "update_product"
    | "receive_inventory"
    | "open_shift"
    | "close_shift"
    | "update_batches"
    | "sync_order_items"
    | "update_event_booking"
    | "update_category"
    | "create_return"
    | "sync_settings"
    | "create_supplier"
    | "update_supplier"
    | "create_expense"
    | "create_discount"
    | "update_discount"
    | "create_coupon"
    | "update_coupon"
    | "create_purchase_order"
    | "update_purchase_order"
    | "create_inventory_movement"
    | "create_audit_log"
    | "create_invoice"
    | "update_invoice"
    | "delete_order";
  payload: string;
  createdAt: string;
  updatedAt: string;
  retries: number;
  lastError: string | null;
  nextRetryAt: string;
  status: "pending" | "failed";
}

export interface CachedProduct extends Product {
  cachedAt: string;
}

class ValentinoOfflineDB extends Dexie {
  products!: Table<CachedProduct, string>;
  syncQueue!: Table<SyncQueueItem, string>;

  constructor() {
    super("valentino-offline");
    this.version(1).stores({
      products: "id, sku, barcode, categoryId, cachedAt",
      syncQueue: "id, action, createdAt",
    });
    this.version(2)
      .stores({
        products: "id, sku, barcode, categoryId, cachedAt",
        syncQueue: "id, action, status, nextRetryAt, createdAt",
      })
      .upgrade(async (transaction) => {
        const now = new Date().toISOString();
        await transaction
          .table<SyncQueueItem, string>("syncQueue")
          .toCollection()
          .modify((item) => {
            item.updatedAt ??= item.createdAt ?? now;
            item.nextRetryAt ??= now;
            item.status ??= "pending";
          });
      });
  }
}

const MAX_SYNC_RETRIES = 8;
/** Fast first retries so online devices recover immediately. */
const INITIAL_RETRY_DELAY_MS = 400;
const MAX_RETRY_DELAY_MS = 30_000;

type SyncQueueListener = () => void;
const syncQueueListeners = new Set<SyncQueueListener>();

export function subscribeSyncQueue(listener: SyncQueueListener): () => void {
  syncQueueListeners.add(listener);
  return () => {
    syncQueueListeners.delete(listener);
  };
}

export function notifySyncQueueChange(): void {
  syncQueueListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Listener errors must not break the queue.
    }
  });
}

export function getSyncRetryDelay(retries: number): number {
  const exponential = Math.min(
    INITIAL_RETRY_DELAY_MS * 2 ** Math.max(0, retries),
    MAX_RETRY_DELAY_MS,
  );
  const jitter = exponential * (Math.random() * 0.4 - 0.2);
  return Math.max(500, Math.round(exponential + jitter));
}

let dbInstance: ValentinoOfflineDB | null = null;

export function getOfflineDB(): ValentinoOfflineDB | null {
  if (typeof window === "undefined") return null;
  if (!dbInstance) dbInstance = new ValentinoOfflineDB();
  return dbInstance;
}

export async function cacheProducts(products: Product[]): Promise<void> {
  const db = getOfflineDB();
  if (!db) return;
  const now = new Date().toISOString();
  await db.products.clear();
  await db.products.bulkPut(
    products.map((p) => ({ ...p, cachedAt: now })),
  );
}

export async function getCachedProducts(): Promise<Product[]> {
  const db = getOfflineDB();
  if (!db) return [];
  return db.products.toArray();
}

export async function enqueueSync(
  action: SyncQueueItem["action"],
  payload: unknown,
): Promise<void> {
  const db = getOfflineDB();
  if (!db) return;
  const serializedPayload = JSON.stringify(payload);
  const duplicate = await db.syncQueue
    .where("action")
    .equals(action)
    .filter(
      (item) =>
        item.payload === serializedPayload &&
        item.status === "pending",
    )
    .first();
  if (duplicate) return;

  const now = new Date().toISOString();
  await db.syncQueue.add({
    id: crypto.randomUUID(),
    action,
    payload: serializedPayload,
    createdAt: now,
    updatedAt: now,
    retries: 0,
    lastError: null,
    nextRetryAt: now,
    status: "pending",
  });
  notifySyncQueueChange();
}

export async function getPendingSyncCount(): Promise<number> {
  const db = getOfflineDB();
  if (!db) return 0;
  return db.syncQueue
    .filter((item) => item.status === "pending")
    .count();
}

export async function getFailedSyncCount(): Promise<number> {
  const db = getOfflineDB();
  if (!db) return 0;
  return db.syncQueue.filter((item) => item.status === "failed").count();
}

export async function clearSyncQueue(): Promise<void> {
  const db = getOfflineDB();
  if (!db) return;
  await db.syncQueue.clear();
}

export async function retryFailedSyncItems(): Promise<void> {
  const db = getOfflineDB();
  if (!db) return;
  const now = new Date().toISOString();
  await db.syncQueue
    .filter((item) => item.status === "failed")
    .modify({
      status: "pending",
      retries: 0,
      lastError: null,
      nextRetryAt: now,
      updatedAt: now,
    });
  notifySyncQueueChange();
}

/** Make every pending item eligible for an immediate flush (e.g. on reconnect). */
export async function wakePendingSyncItems(): Promise<void> {
  const db = getOfflineDB();
  if (!db) return;
  const now = new Date().toISOString();
  await db.syncQueue
    .filter((item) => item.status === "pending")
    .modify({
      nextRetryAt: now,
      updatedAt: now,
    });
  notifySyncQueueChange();
}

export async function processSyncQueue(
  handler: (item: SyncQueueItem) => Promise<void>,
): Promise<number> {
  const db = getOfflineDB();
  if (!db) return 0;
  const now = new Date();
  const items = await db.syncQueue
    .where("status")
    .equals("pending")
    .filter(
      (item) =>
        item.retries < MAX_SYNC_RETRIES &&
        new Date(item.nextRetryAt).getTime() <= now.getTime(),
    )
    .sortBy("createdAt");
  let processed = 0;
  let changed = false;
  for (const item of items) {
    try {
      await handler(item);
      await db.syncQueue.delete(item.id);
      processed++;
      changed = true;
    } catch (err) {
      const retries = item.retries + 1;
      const failed = retries >= MAX_SYNC_RETRIES;
      const updatedAt = new Date().toISOString();
      await db.syncQueue.update(item.id, {
        retries,
        lastError: err instanceof Error ? err.message : "خطأ غير معروف",
        status: failed ? "failed" : "pending",
        nextRetryAt: failed
          ? updatedAt
          : new Date(
              Date.now() + getSyncRetryDelay(retries),
            ).toISOString(),
        updatedAt,
      });
      changed = true;
    }
  }
  if (changed) notifySyncQueueChange();
  return processed;
}
