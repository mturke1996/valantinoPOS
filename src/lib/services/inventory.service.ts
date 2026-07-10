import type {
  Batch,
  FefoDeductInput,
  FefoDeductResult,
  InventoryMovement,
  InventoryMovementType,
  Order,
} from "@/types";
import { generateId, nowISO } from "@/lib/utils";

export interface AddMovementInput {
  branchId: string;
  productId: string;
  batchId?: string | null;
  type: InventoryMovementType;
  quantity: number;
  referenceType?: string | null;
  referenceId?: string | null;
  notes?: string | null;
  createdBy?: string | null;
}

export function addMovement(input: AddMovementInput): InventoryMovement {
  return {
    id: generateId(),
    branchId: input.branchId,
    productId: input.productId,
    batchId: input.batchId ?? null,
    type: input.type,
    quantity: input.quantity,
    referenceType: input.referenceType ?? null,
    referenceId: input.referenceId ?? null,
    notes: input.notes ?? null,
    createdBy: input.createdBy ?? null,
    createdAt: nowISO(),
  };
}

export function sortBatchesFefo(batches: Batch[]): Batch[] {
  return [...batches]
    .filter((b) => b.quantity > 0)
    .sort(
      (a, b) =>
        new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime(),
    );
}

export function fefoDeduct(
  batches: Batch[],
  input: FefoDeductInput,
): { updatedBatches: Batch[]; result: FefoDeductResult } {
  const eligible = sortBatchesFefo(
    batches.filter(
      (b) =>
        b.productId === input.productId &&
        b.branchId === input.branchId &&
        b.quantity > 0,
    ),
  );

  let remaining = input.quantity;
  const allocations: Array<{ batchId: string; quantity: number }> = [];
  const movements: InventoryMovement[] = [];
  const updatedBatches = [...batches];

  for (const batch of eligible) {
    if (remaining <= 0) break;

    const deductQty = Math.min(batch.quantity, remaining);
    const batchIndex = updatedBatches.findIndex((b) => b.id === batch.id);
    if (batchIndex === -1) continue;

    updatedBatches[batchIndex] = {
      ...updatedBatches[batchIndex],
      quantity: roundBatchQty(updatedBatches[batchIndex].quantity - deductQty),
      updatedAt: nowISO(),
    };

    allocations.push({ batchId: batch.id, quantity: deductQty });
    movements.push(
      addMovement({
        branchId: input.branchId,
        productId: input.productId,
        batchId: batch.id,
        type: "sale",
        quantity: -deductQty,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        createdBy: input.createdBy,
        notes: `خصم FEFO — دفعة ${batch.batchNumber}`,
      }),
    );

    remaining = roundBatchQty(remaining - deductQty);
  }

  return {
    updatedBatches,
    result: {
      movements,
      allocations,
      remainingQuantity: remaining,
    },
  };
}

export function addStockToBatch(
  batches: Batch[],
  batchId: string,
  quantity: number,
): Batch[] {
  return batches.map((b) =>
    b.id === batchId
      ? {
          ...b,
          quantity: roundBatchQty(b.quantity + quantity),
          updatedAt: nowISO(),
        }
      : b,
  );
}

export function getTotalStock(batches: Batch[], productId: string): number {
  return roundBatchQty(
    batches
      .filter((b) => b.productId === productId && b.quantity > 0)
      .reduce((sum, b) => sum + b.quantity, 0),
  );
}

export function getReservedStock(orders: Order[], productId: string): number {
  return roundBatchQty(
    orders
      .filter(
        (order) =>
          !order.deletedAt &&
          order.type !== "pos" &&
          order.status !== "completed" &&
          order.status !== "cancelled",
      )
      .flatMap((order) => order.items)
      .filter((item) => item.productId === productId)
      .reduce((sum, item) => sum + item.quantity, 0),
  );
}

export function getAvailableStock(
  batches: Batch[],
  orders: Order[],
  productId: string,
): number {
  return roundBatchQty(
    Math.max(
      0,
      getTotalStock(batches, productId) -
        getReservedStock(orders, productId),
    ),
  );
}

export function getExpiringBatches(
  batches: Batch[],
  withinDays = 30,
): Batch[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + withinDays);
  return batches.filter(
    (b) =>
      b.quantity > 0 && new Date(b.expiryDate).getTime() <= cutoff.getTime(),
  );
}

function roundBatchQty(qty: number): number {
  return Math.round(qty * 1000) / 1000;
}
