import { beforeEach, describe, expect, it } from "vitest";

import { createSeedState } from "@/lib/data/seed";
import {
  cancelOrder,
  closeShift,
  createOrder,
  createProduct,
  createReturn,
  ensureInvoiceForOrder,
  getState,
  processPayment,
  recordShiftHandover,
  setState,
  updateSettings,
} from "@/lib/data/store";
import { roundMoney } from "@/lib/utils";

function activeProduct() {
  const product = getState().products.find((item) => item.isActive);
  expect(product).toBeDefined();
  return product!;
}

describe("POS payment integrity", () => {
  beforeEach(() => {
    setState(createSeedState());
  });

  it("completes a paid POS order without inventory tracking", () => {
    const initial = getState();
    const product = activeProduct();
    const openShift = initial.shifts.find((shift) => shift.status === "open");
    expect(openShift).toBeDefined();

    const order = createOrder({
      branchId: initial.settings.branchId,
      type: "pos",
      items: [{ productId: product.id, quantity: 1 }],
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

    expect(completedOrder?.status).toBe("completed");
    expect(completedOrder?.paymentStatus).toBe("paid");
    expect(
      final.invoices.some((invoice) => invoice.orderId === order.id),
    ).toBe(true);
    expect(
      final.shifts.find((shift) => shift.id === openShift!.id)?.expectedCash,
    ).toBe(openShift!.expectedCash + order.total);
  });

  it("rejects overpayment before mutating the order", () => {
    const state = getState();
    const product = activeProduct();

    const order = createOrder({
      branchId: state.settings.branchId,
      type: "event",
      items: [{ productId: product.id, quantity: 1 }],
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
    const product = activeProduct();

    const order = createOrder({
      branchId: state.settings.branchId,
      type: "event",
      items: [{ productId: product.id, quantity: 1 }],
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

  it("prices delivery and keeps one invoice when paid later", () => {
    const state = getState();
    const product = activeProduct();

    const order = createOrder({
      branchId: state.settings.branchId,
      type: "delivery",
      items: [{ productId: product.id, quantity: 1 }],
      deliveryDate: "2026-07-20",
      deliveryTime: "12:00",
      deliveryAddress: "طرابلس المركز",
      deliveryFee: 12,
    });
    expect(order.deliveryFee).toBe(12);
    expect(order.total).toBe(
      order.subtotal - order.discountAmount + order.taxAmount + 12,
    );

    ensureInvoiceForOrder(order.id);
    processPayment({
      orderId: order.id,
      method: "cash",
      amount: order.total,
      cashAmount: order.total,
    });

    expect(
      getState().invoices.filter((invoice) => invoice.orderId === order.id),
    ).toHaveLength(1);
  });

  it("blocks walk-in orders when shift sales are disabled", () => {
    const state = getState();
    const product = activeProduct();
    updateSettings({ walkInSalesEnabled: false });

    expect(() =>
      createOrder({
        branchId: state.settings.branchId,
        type: "pos",
        items: [{ productId: product.id, quantity: 1 }],
      }),
    ).toThrow("البيع الفوري متوقف");
  });
});

describe("catalog integrity", () => {
  beforeEach(() => {
    setState(createSeedState());
  });

  it("creates a normalized product without stock tracking", () => {
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

    const saved = getState().products.find((item) => item.id === product.id);
    expect(saved?.sku).toBe("VAL-NEW-001");
    expect(saved?.nameAr).toBe("شوكولاتة اختبار");
    expect(saved?.trackStock).toBe(false);
    expect(saved?.stockQuantity).toBe(0);
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

  it("allows selling the same product across concurrent orders", () => {
    const state = getState();
    const product = activeProduct();

    createOrder({
      branchId: state.settings.branchId,
      type: "delivery",
      items: [{ productId: product.id, quantity: 100 }],
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
    ).not.toThrow();
  });
});

describe("shift cash integrity", () => {
  beforeEach(() => {
    setState(createSeedState());
  });

  it("keeps expected cash after handover when closing", () => {
    const initial = getState();
    const product = activeProduct();
    const openShift = initial.shifts.find((shift) => shift.status === "open")!;
    const baseline = openShift.expectedCash;

    const order = createOrder({
      branchId: initial.settings.branchId,
      type: "pos",
      items: [{ productId: product.id, quantity: 1 }],
      shiftId: openShift.id,
      createdBy: initial.users[0]?.id,
    });
    processPayment({
      orderId: order.id,
      shiftId: openShift.id,
      method: "cash",
      amount: order.total,
      cashAmount: order.total,
      userId: initial.users[0]?.id,
    });

    const afterSale = getState().shifts.find((s) => s.id === openShift.id)!;
    expect(afterSale.expectedCash).toBe(roundMoney(baseline + order.total));

    const counted = roundMoney(afterSale.expectedCash - 5);
    recordShiftHandover({
      shiftId: openShift.id,
      countedCash: counted,
      userId: initial.users[0]?.id,
    });

    const postHandover = getState().shifts.find((s) => s.id === openShift.id)!;
    expect(postHandover.openingFloat).toBe(counted);
    expect(postHandover.expectedCash).toBe(counted);

    const second = createOrder({
      branchId: initial.settings.branchId,
      type: "pos",
      items: [{ productId: product.id, quantity: 1 }],
      shiftId: openShift.id,
      createdBy: initial.users[0]?.id,
    });
    processPayment({
      orderId: second.id,
      shiftId: openShift.id,
      method: "cash",
      amount: second.total,
      cashAmount: second.total,
      userId: initial.users[0]?.id,
    });

    const expectedBeforeClose = roundMoney(counted + second.total);
    expect(
      getState().shifts.find((s) => s.id === openShift.id)?.expectedCash,
    ).toBe(expectedBeforeClose);

    const closed = closeShift(openShift.id, expectedBeforeClose);
    expect(closed?.expectedCash).toBe(expectedBeforeClose);
    expect(closed?.variance).toBe(0);
  });

  it("subtracts cash refunds from expected cash on close", () => {
    const initial = getState();
    const product = activeProduct();
    const openShift = initial.shifts.find((shift) => shift.status === "open")!;

    const order = createOrder({
      branchId: initial.settings.branchId,
      type: "pos",
      items: [{ productId: product.id, quantity: 1 }],
      shiftId: openShift.id,
      createdBy: initial.users[0]?.id,
    });
    processPayment({
      orderId: order.id,
      shiftId: openShift.id,
      method: "cash",
      amount: order.total,
      cashAmount: order.total,
      userId: initial.users[0]?.id,
    });

    const paid = getState().orders.find((o) => o.id === order.id)!;
    const line = paid.items[0]!;
    createReturn({
      branchId: initial.settings.branchId,
      orderId: order.id,
      shiftId: openShift.id,
      refundMethod: "cash",
      createdBy: initial.users[0]?.id,
      items: [
        {
          orderItemId: line.id,
          productId: line.productId,
          quantity: 1,
          restock: false,
        },
      ],
    });

    const afterReturn = getState().shifts.find((s) => s.id === openShift.id)!;
    const closed = closeShift(openShift.id, afterReturn.expectedCash);
    expect(closed?.expectedCash).toBe(afterReturn.expectedCash);
    expect(closed?.variance).toBe(0);
  });
});

describe("order cancellation", () => {
  beforeEach(() => {
    setState(createSeedState());
  });

  it("soft-cancels an order without deleting it and records history", () => {
    const initial = getState();
    const product = activeProduct();
    const actor = initial.users[0]?.id ?? null;

    const order = createOrder({
      branchId: initial.settings.branchId,
      type: "event",
      items: [{ productId: product.id, quantity: 1 }],
    });
    expect(order.status).toBe("received");

    const historyBeforeCancel = getState().orderStatusHistory.filter(
      (entry) => entry.orderId === order.id,
    ).length;
    const result = cancelOrder(order.id, actor);

    expect(result).not.toBeNull();
    expect(result?.status).toBe("cancelled");

    const after = getState().orders.find((o) => o.id === order.id)!;
    expect(after.status).toBe("cancelled");
    expect(after.deletedAt).toBeNull();
    expect(typeof after.updatedAt).toBe("string");
    expect(after.updatedAt.length).toBeGreaterThan(0);

    const orderHistory = getState().orderStatusHistory.filter(
      (entry) => entry.orderId === order.id,
    );
    expect(orderHistory.length).toBe(historyBeforeCancel + 1);

    const cancelEntry = orderHistory.find(
      (entry) => entry.toStatus === "cancelled",
    );
    expect(cancelEntry).toBeDefined();
    expect(cancelEntry!.fromStatus).toBe("received");
    expect(cancelEntry!.toStatus).toBe("cancelled");
    expect(cancelEntry!.changedBy).toBe(actor);
  });

  it("throws when cancelling an already-completed order", () => {
    const initial = getState();
    const product = activeProduct();
    const openShift = initial.shifts.find((shift) => shift.status === "open")!;

    const order = createOrder({
      branchId: initial.settings.branchId,
      type: "pos",
      items: [{ productId: product.id, quantity: 1 }],
      shiftId: openShift.id,
      createdBy: initial.users[0]?.id,
    });
    processPayment({
      orderId: order.id,
      shiftId: openShift.id,
      method: "cash",
      amount: order.total,
      cashAmount: order.total,
      userId: initial.users[0]?.id,
    });

    const completed = getState().orders.find((o) => o.id === order.id)!;
    expect(completed.status).toBe("completed");

    expect(() => cancelOrder(order.id)).toThrow();
  });

  it("returns null for an unknown order id", () => {
    expect(cancelOrder("does-not-exist")).toBeNull();
  });
});
