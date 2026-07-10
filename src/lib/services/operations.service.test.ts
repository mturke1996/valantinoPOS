import { format } from "date-fns";
import { describe, expect, it } from "vitest";

import {
  getPosSalesActivity,
  getTodayOperations,
} from "@/lib/services/operations.service";
import type { AppState } from "@/types";

function makeState(overrides: Partial<AppState> = {}): AppState {
  const today = format(new Date(), "yyyy-MM-dd");
  return {
    version: 1,
    initializedAt: new Date().toISOString(),
    settings: {
      branchId: "branch-1",
      branchName: "فالنتينو",
      branchAddress: "طرابلس — ليبيا",
      branchPhone: "+218911000000",
      country: "LY",
      taxRate: 0,
      currency: "LYD",
      currencySymbol: "د.ل",
      locale: "ar-LY",
      logoUrl: null,
      loyaltyPointsPerSar: 1,
      loyaltyRedeemRate: 0.1,
      orderNumberPrefix: "ORD",
      invoiceNumberPrefix: "INV",
    },
    products: [],
    categories: [],
    customers: [
      {
        id: "cust-1",
        branchId: "branch-1",
        name: "سارة",
        phone: "0500000000",
        whatsapp: null,
        email: null,
        birthday: null,
        loyaltyTierId: "tier-1",
        loyaltyPoints: 0,
        totalSpent: 0,
        orderCount: 0,
        lastOrderAt: null,
        wholesalePricing: false,
        notes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      },
    ],
    orders: [
      {
        id: "ord-1",
        branchId: "branch-1",
        orderNumber: "EVT-001",
        customerId: "cust-1",
        type: "event",
        status: "preparing",
        items: [],
        subtotal: 1000,
        taxAmount: 150,
        discountAmount: 0,
        total: 1150,
        paidAmount: 500,
        paymentStatus: "partial",
        deliveryDate: today,
        deliveryTime: "18:00",
        deliveryAddress: "استلام من المتجر",
        notes: null,
        assignedTo: null,
        shiftId: null,
        createdBy: null,
        couponCode: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      },
    ],
    events: [
      {
        id: "ev-1",
        orderId: "ord-1",
        eventType: "wedding",
        guestCount: 100,
        packagingColors: ["ذهبي"],
        giftCardMessage: null,
        giftCardPhrase: null,
        specialNotes: null,
        createdAt: new Date().toISOString(),
      },
    ],
    batches: [],
    inventoryMovements: [],
    payments: [],
    invoices: [],
    suppliers: [],
    purchaseOrders: [],
    expenses: [],
    returns: [],
    discounts: [],
    users: [],
    notifications: [],
    auditLogs: [],
    shifts: [],
    coupons: [],
    loyaltyTiers: [],
    loyaltyPointsLog: [],
    orderStatusHistory: [],
    ...overrides,
  } as AppState;
}

describe("getTodayOperations", () => {
  it("returns scheduled orders for today with event metadata", () => {
    const items = getTodayOperations(makeState());
    expect(items).toHaveLength(1);
    expect(items[0]?.kind).toBe("event");
    expect(items[0]?.title).toContain("زفاف");
    expect(items[0]?.urgent).toBe(true);
  });

  it("marks deposit orders when balance remains", () => {
    const state = makeState();
    state.orders[0]!.paidAmount = 200;
    state.events = [];
    const items = getTodayOperations(state);
    expect(items[0]?.kind).toBe("deposit");
    expect(items[0]?.subtitle).toContain("متبقي");
  });
});

describe("getPosSalesActivity", () => {
  it("counts partial scheduled collections in the active shift", () => {
    const now = new Date().toISOString();
    const state = makeState({
      payments: [
        {
          id: "pay-1",
          orderId: "ord-1",
          shiftId: "shift-1",
          method: "mixed",
          amount: 500,
          cashAmount: 200,
          cardAmount: 300,
          reference: null,
          createdAt: now,
        },
      ],
    });

    const activity = getPosSalesActivity(state, "shift-1");

    expect(activity.collectionCount).toBe(1);
    expect(activity.collectedTotal).toBe(500);
    expect(activity.cashTotal).toBe(200);
    expect(activity.cardTotal).toBe(300);
    expect(activity.transferTotal).toBe(0);
    expect(activity.scheduledCollections).toBe(1);
    expect(activity.entries[0]?.customerName).toBe("سارة");
  });
});
