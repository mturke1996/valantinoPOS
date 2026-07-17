import { describe, expect, it } from "vitest";

import {
  buildDueEventReminders,
  buildTelegramDueReminders,
  getUpcomingEvents,
  REMINDER_OFFSETS,
} from "@/lib/reminders/event-reminders";
import { createInitialState } from "@/lib/data/initial-state";
import type { Order } from "@/types";

function makeOrder(partial: Partial<Order> & Pick<Order, "id" | "deliveryDate">): Order {
  return {
    id: partial.id,
    branchId: "branch-1",
    orderNumber: partial.orderNumber ?? "VAL-1",
    type: "event",
    status: partial.status ?? "preparing",
    customerId: null,
    assignedTo: null,
    shiftId: null,
    subtotal: 100,
    discountAmount: 0,
    taxAmount: 0,
    deliveryFee: 0,
    total: 100,
    paidAmount: 50,
    paymentStatus: "partial",
    deliveryDate: partial.deliveryDate,
    deliveryTime: partial.deliveryTime ?? "15:00",
    deliveryAddress: partial.deliveryAddress ?? "طرابلس",
    deliveryZone: null,
    deliveryRecipientName: null,
    deliveryPhone: null,
    deliveryInstructions: null,
    notes: null,
    couponCode: null,
    items: [
      {
        id: "item-1",
        orderId: partial.id,
        productId: "p1",
        variantId: null,
        batchId: null,
        productNameAr: "شوكولاتة",
        quantity: 2,
        unitPrice: 50,
        discount: 0,
        total: 100,
        weightGrams: null,
        notes: null,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
    createdBy: null,
  };
}

describe("event reminders", () => {
  it("exposes the standard prep windows", () => {
    expect(REMINDER_OFFSETS.map((o) => o.key)).toEqual(["3d", "2d", "1d"]);
  });

  it("lists upcoming events with countdown urgency", () => {
    const state = createInitialState();
    const now = Date.parse("2026-07-17T10:00:00.000Z");
    state.orders = [
      makeOrder({
        id: "o1",
        orderNumber: "VAL-100",
        deliveryDate: "2026-07-17",
        deliveryTime: "12:00",
      }),
      makeOrder({
        id: "o2",
        orderNumber: "VAL-101",
        deliveryDate: "2026-07-19",
        deliveryTime: "18:00",
      }),
    ];

    const upcoming = getUpcomingEvents(state, 7, now);
    expect(upcoming).toHaveLength(2);
    expect(upcoming[0]?.orderNumber).toBe("VAL-100");
    expect(upcoming[0]?.urgency).toBe("now");
    expect(["soon", "tomorrow"]).toContain(upcoming[1]?.urgency);
  });

  it("builds due in-app reminders with dedup keys", () => {
    const state = createInitialState();
    const now = Date.parse("2026-07-17T10:00:00.000Z");
    state.orders = [
      makeOrder({
        id: "o1",
        deliveryDate: "2026-07-18",
        deliveryTime: "10:00",
      }),
    ];

    const keys = new Set<string>();
    const reminders = buildDueEventReminders(state, keys, now);
    expect(reminders.some((r) => r.dedupKey === "reminder:o1:1d")).toBe(true);
    expect(keys.has("reminder:o1:1d")).toBe(true);
  });

  it("formats telegram reminder payloads", () => {
    const now = Date.parse("2026-07-17T10:00:00.000Z");
    const messages = buildTelegramDueReminders(
      [
        {
          id: "o1",
          orderNumber: "VAL-9",
          deliveryDate: "2026-07-17",
          deliveryTime: "12:00",
          deliveryAddress: "طرابلس",
          status: "preparing",
          total: 200,
          paidAmount: 0,
          customerName: "أحمد",
          itemSummary: "شوكولاتة ×2",
          itemCount: 2,
          currencySymbol: "د.ل",
        },
      ],
      new Set(),
      now,
    );

    expect(messages.length).toBeGreaterThan(0);
    expect(messages.some((m) => m.offsetKey === "today")).toBe(true);
    expect(messages[0]?.text).toContain("VAL-9");
  });
});
