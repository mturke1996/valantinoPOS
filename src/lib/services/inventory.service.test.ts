import { describe, expect, it } from "vitest";
import { fefoDeduct, sortBatchesFefo } from "./inventory.service";
import type { Batch } from "@/types";

const batches: Batch[] = [
  {
    id: "b1",
    branchId: "br1",
    productId: "p1",
    batchNumber: "LOT-001",
    quantity: 10,
    expiryDate: "2026-12-01",
    costPerUnit: 5,
    receivedAt: "2026-01-01T00:00:00Z",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "b2",
    branchId: "br1",
    productId: "p1",
    batchNumber: "LOT-002",
    quantity: 20,
    expiryDate: "2026-06-01",
    costPerUnit: 5,
    receivedAt: "2026-02-01T00:00:00Z",
    createdAt: "2026-02-01T00:00:00Z",
    updatedAt: "2026-02-01T00:00:00Z",
  },
];

describe("inventory.service", () => {
  it("sorts batches by expiry FEFO", () => {
    const sorted = sortBatchesFefo(batches);
    expect(sorted[0].id).toBe("b2");
    expect(sorted[1].id).toBe("b1");
  });

  it("deducts from earliest expiry first", () => {
    const { result, updatedBatches } = fefoDeduct(batches, {
      branchId: "br1",
      productId: "p1",
      quantity: 15,
    });

    expect(result.remainingQuantity).toBe(0);
    expect(result.allocations).toHaveLength(1);
    expect(result.allocations[0].batchId).toBe("b2");
    expect(result.allocations[0].quantity).toBe(15);

    const b2 = updatedBatches.find((b) => b.id === "b2");
    expect(b2?.quantity).toBe(5);
  });

  it("spans multiple batches when first is insufficient", () => {
    const { result } = fefoDeduct(batches, {
      branchId: "br1",
      productId: "p1",
      quantity: 25,
    });

    expect(result.remainingQuantity).toBe(0);
    expect(result.allocations).toHaveLength(2);
    expect(result.allocations[0].batchId).toBe("b2");
    expect(result.allocations[1].batchId).toBe("b1");
  });

  it("reports remaining when insufficient stock", () => {
    const { result } = fefoDeduct(batches, {
      branchId: "br1",
      productId: "p1",
      quantity: 100,
    });
    expect(result.remainingQuantity).toBeGreaterThan(0);
    expect(result.allocations.length).toBeGreaterThan(0);
  });
});
