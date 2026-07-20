import type { SyncQueueItem } from "@/lib/offline/db";
import { getOfflineDB } from "@/lib/offline/db";

function collectId(
  ids: Set<string>,
  value: unknown,
): void {
  if (typeof value === "string" && value.length > 8) ids.add(value);
}

function idsFromSyncItem(item: SyncQueueItem): string[] {
  try {
    const payload = JSON.parse(item.payload) as Record<string, unknown>;
    const ids: string[] = [];

    if (item.action === "create_order" || item.action === "update_event_booking" || item.action === "update_order") {
      const order = payload.order as { id?: string } | undefined;
      if (order?.id) ids.push(order.id);
      const event = payload.event as { id?: string } | undefined;
      if (event?.id) ids.push(event.id);
      const history = payload.statusHistory as { id?: string } | undefined;
      if (history?.id) ids.push(history.id);
    }
    if (item.action === "process_payment") {
      const payment = payload.payment as { id?: string; orderId?: string } | undefined;
      if (payment?.id) ids.push(payment.id);
      if (payment?.orderId) ids.push(payment.orderId);
      const history = payload.statusHistory as { id?: string } | undefined;
      if (history?.id) ids.push(history.id);
    }
    if (item.action === "update_status" || item.action === "delete_order") {
      if (typeof payload.orderId === "string") ids.push(payload.orderId);
      const history = payload.statusHistory as { id?: string } | undefined;
      if (history?.id) ids.push(history.id);
    }
    if (
      item.action === "create_product" ||
      item.action === "update_product"
    ) {
      const product = payload.product as { id?: string } | undefined;
      if (product?.id) ids.push(product.id);
    }
    if (
      item.action === "create_category" ||
      item.action === "update_category"
    ) {
      const category = payload.category as { id?: string } | undefined;
      if (category?.id) ids.push(category.id);
    }
    if (
      item.action === "create_customer" ||
      item.action === "update_customer"
    ) {
      const customer = payload.customer as { id?: string } | undefined;
      if (customer?.id) ids.push(customer.id);
    }
    if (item.action === "create_return") {
      const returnRecord = payload.returnRecord as { id?: string; orderId?: string } | undefined;
      if (returnRecord?.id) ids.push(returnRecord.id);
      if (returnRecord?.orderId) ids.push(returnRecord.orderId);
    }
    if (item.action === "sync_settings") {
      collectId(new Set(), payload.branchId);
    }
    if (item.action === "create_supplier" || item.action === "update_supplier") {
      const supplier = payload.supplier as { id?: string } | undefined;
      if (supplier?.id) ids.push(supplier.id);
    }
    if (item.action === "create_expense") {
      const expense = payload.expense as { id?: string } | undefined;
      if (expense?.id) ids.push(expense.id);
    }
    if (
      item.action === "create_discount" ||
      item.action === "update_discount"
    ) {
      const discount = payload.discount as { id?: string } | undefined;
      if (discount?.id) ids.push(discount.id);
    }
    if (
      item.action === "create_coupon" ||
      item.action === "update_coupon"
    ) {
      const coupon = payload.coupon as { id?: string } | undefined;
      if (coupon?.id) ids.push(coupon.id);
    }
    if (
      item.action === "create_purchase_order" ||
      item.action === "update_purchase_order"
    ) {
      const purchaseOrder = payload.purchaseOrder as { id?: string } | undefined;
      if (purchaseOrder?.id) ids.push(purchaseOrder.id);
    }
    if (item.action === "create_inventory_movement") {
      const movement = payload.movement as { id?: string } | undefined;
      if (movement?.id) ids.push(movement.id);
    }
    if (item.action === "create_audit_log") {
      const log = payload.log as { id?: string } | undefined;
      if (log?.id) ids.push(log.id);
    }
    if (item.action === "create_invoice" || item.action === "update_invoice") {
      const invoice = payload.invoice as { id?: string } | undefined;
      if (invoice?.id) ids.push(invoice.id);
    }
    if (item.action === "open_shift" || item.action === "close_shift") {
      const shift = payload.shift as { id?: string } | undefined;
      if (shift?.id) ids.push(shift.id);
    }
    if (item.action === "receive_inventory" || item.action === "update_batches") {
      const batch = payload.batch as { id?: string } | undefined;
      if (batch?.id) ids.push(batch.id);
      const batches = payload.batches as Array<{ id?: string }> | undefined;
      batches?.forEach((b) => b.id && ids.push(b.id));
    }
    if (item.action === "sync_order_items") {
      if (typeof payload.orderId === "string") ids.push(payload.orderId);
    }

    return ids;
  } catch {
    return [];
  }
}

export async function getProtectedEntityIds(): Promise<Set<string>> {
  const db = getOfflineDB();
  if (!db) return new Set();

  const items = await db.syncQueue
    .filter((item) => item.status === "pending" || item.status === "failed")
    .toArray();

  const ids = new Set<string>();
  for (const item of items) {
    for (const id of idsFromSyncItem(item)) ids.add(id);
  }
  return ids;
}

export function mergeRecordsById<T extends { id: string }>(
  local: T[],
  cloud: T[],
  protectedIds: Set<string>,
): T[] {
  const merged = new Map<string, T>();
  for (const row of cloud) merged.set(row.id, row);
  for (const row of local) {
    if (protectedIds.has(row.id)) merged.set(row.id, row);
  }
  return Array.from(merged.values());
}
