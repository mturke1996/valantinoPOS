import { beforeEach, describe, expect, it } from "vitest";

import { createSeedState } from "@/lib/data/seed";
import {
  createOrder,
  createProduct,
  getState,
  processPayment,
  receiveInventoryBatch,
  setState,
} from "@/lib/data/store";
import { getAvailableStock } from "@/lib/services/inventory.service";

describe("POS payment integrity", () => {
  beforeEach(() => {
    setState(createSeedState());
  });

  it("completes a paid POS order and deducts inventory", () => {
    const initial = getState();
    const product = initial.products.find(
      (item) => item.isActive && item.stockQuantity >= 1,
    );
    const openShift = initial.shifts.find((shift) => shift.status === "open");
    expect(product).toBeDefined();
    expect(openShift).toBeDefined();

    const order = createOrder({
      branchId: initial.settings.branchId,
      type: "pos",
      items: [{ productId: product!.id, quantity: 1 }],
      shiftId: openShift!.id,
      createdBy: initial.users[0]?.id,
    });

    processPayment({
      orderId: order.id,
      shiftId: openShift!.id,
      method: "cash",
      amount: order.total,
      cashAmount: order.total,
      userId: initial.users[0]?.id,
    });

    const final = getState();
    const completedOrder = final.orders.find((item) => item.id === order.id);
    const updatedProduct = final.products.find(
      (item) => item.id === product!.id,
    );

    expect(completedOrder?.status).toBe("completed");
    expect(completedOrder?.paymentStatus).toBe("paid");
    expect(updatedProduct?.stockQuantity).toBe(product!.stockQuantity - 1);
    expect(
      final.invoices.some((invoice) => invoice.orderId === order.id),
    ).toBe(true);
    expect(
      final.shifts.find((shift) => shift.id === openShift!.id)?.expectedCash,
    ).toBe(openShift!.expectedCash + order.total);
  });

  it("rejects overpayment before mutating the order", () => {
    const state = getState();
    const product = state.products.find(
      (item) => item.isActive && item.stockQuantity >= 1,
    );
    expect(product).toBeDefined();

    const order = createOrder({
      branchId: state.settings.branchId,
      type: "event",
      items: [{ productId: product!.id, quantity: 1 }],
    });

    expect(() =>
      processPayment({
        orderId: order.id,
        method: "cash",
        amount: order.total + 1,
        cashAmount: order.total + 1,
      }),
    ).toThrow("أكبر من المتبقي");

    const unchanged = getState().orders.find((item) => item.id === order.id);
    expect(unchanged?.paidAmount).toBe(0);
    expect(unchanged?.paymentStatus).toBe("unpaid");
  });

  it("rejects an invalid mixed-payment split", () => {
    const state = getState();
    const product = state.products.find(
      (item) => item.isActive && item.stockQuantity >= 1,
    );
    expect(product).toBeDefined();

    const order = createOrder({
      branchId: state.settings.branchId,
      type: "event",
      items: [{ productId: product!.id, quantity: 1 }],
    });

    expect(() =>
      processPayment({
        orderId: order.id,
        method: "mixed",
        amount: order.total,
        cashAmount: 1,
        cardAmount: 1,
      }),
    ).toThrow("لا يساوي مبلغ الدفع");
  });
});

describe("catalog and reserved inventory integrity", () => {
  beforeEach(() => {
    setState(createSeedState());
  });

  it("creates a normalized product with an auditable opening batch", () => {
    const initial = getState();
    const category = initial.categories[0]!;
    const product = createProduct({
      branchId: initial.settings.branchId,
      categoryId: category.id,
      sku: "  val-new-001 ",
      barcode: " 628000000001 ",
      nameAr: "  شوكولاتة اختبار  ",
      nameEn: " Test Chocolate ",
      description: " صنف اختباري ",
      costPrice: 10,
      retailPrice: 18,
      wholesalePrice: 15,
      unitType: "box",
      weightGrams: 250,
      origin: " بلجيكا ",
      minStock: 3,
      isBundle: false,
      isActive: true,
      trackStock: true,
    });

    receiveInventoryBatch({
      branchId: initial.settings.branchId,
      productId: product.id,
      batchNumber: " lot-open-1 ",
      quantity: 12,
      expiryDate: new Date(Date.now() + 86_400_000 * 30)
        .toISOString()
        .slice(0, 10),
      costPerUnit: 10,
    });

    const final = getState();
    const saved = final.products.find((item) => item.id === product.id);
    const batch = final.batches.find((item) => item.productId === product.id);

    expect(saved?.sku).toBe("VAL-NEW-001");
    expect(saved?.nameAr).toBe("شوكولاتة اختبار");
    expect(saved?.stockQuantity).toBe(12);
    expect(batch?.batchNumber).toBe("LOT-OPEN-1");
    expect(
      final.inventoryMovements.some(
        (movement) =>
          movement.productId === product.id &&
          movement.type === "add" &&
          movement.quantity === 12,
      ),
    ).toBe(true);
  });

  it("rejects duplicate SKU values within the branch", () => {
    const state = getState();
    const existing = state.products[0]!;

    expect(() =>
      createProduct({
        branchId: existing.branchId,
        categoryId: existing.categoryId,
        sku: existing.sku.toLowerCase(),
        barcode: "628999999999",
        nameAr: "صنف مكرر",
        nameEn: null,
        description: "",
        costPrice: 1,
        retailPrice: 2,
        wholesalePrice: 1.5,
        unitType: "piece",
        weightGrams: null,
        origin: "",
        minStock: 0,
        isBundle: false,
        isActive: true,
        trackStock: false,
      }),
    ).toThrow("SKU");
  });

  it("prevents walk-in sales from consuming stock reserved for delivery", () => {
    const state = getState();
    const product = state.products.find(
      (item) =>
        item.isActive &&
        getAvailableStock(state.batches, state.orders, item.id) >= 2,
    )!;
    const available = getAvailableStock(
      state.batches,
      state.orders,
      product.id,
    );

    createOrder({
      branchId: state.settings.branchId,
      type: "delivery",
      items: [{ productId: product.id, quantity: available }],
      deliveryDate: new Date(Date.now() + 86_400_000)
        .toISOString()
        .slice(0, 10),
    });

    expect(() =>
      createOrder({
        branchId: state.settings.branchId,
        type: "pos",
        items: [{ productId: product.id, quantity: 1 }],
      }),
    ).toThrow("بعد حجوزات الطلبات");
  });
});
