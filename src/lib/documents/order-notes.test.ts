import { describe, expect, it } from "vitest";

import {
  collectDocumentNotes,
  hasDocumentNotes,
} from "@/lib/documents/order-notes";
import type { Event, Order } from "@/types";

function baseOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "ord-1",
    branchId: "br-1",
    orderNumber: "VAL-001",
    customerId: null,
    type: "event",
    status: "received",
    items: [],
    subtotal: 0,
    discountAmount: 0,
    taxAmount: 0,
    total: 0,
    paidAmount: 0,
    paymentStatus: "unpaid",
    deliveryDate: null,
    deliveryTime: null,
    deliveryAddress: null,
    deliveryFee: 0,
    deliveryZone: null,
    deliveryRecipientName: null,
    deliveryPhone: null,
    deliveryInstructions: null,
    notes: null,
    assignedTo: null,
    shiftId: null,
    createdBy: null,
    couponCode: null,
    createdAt: "2026-07-18T10:00:00.000Z",
    updatedAt: "2026-07-18T10:00:00.000Z",
    deletedAt: null,
    ...overrides,
  };
}

describe("collectDocumentNotes", () => {
  it("collects labeled notes without duplicates", () => {
    const event: Event = {
      id: "ev-1",
      orderId: "ord-1",
      eventType: "wedding",
      guestCount: 50,
      packagingColors: [],
      giftCardMessage: "مبروك الزواج",
      giftCardPhrase: null,
      specialNotes: "توزيع على طاولات",
      createdAt: "2026-07-18T10:00:00.000Z",
    };

    const entries = collectDocumentNotes(
      baseOrder({
        notes: "توزيع على طاولات",
        deliveryInstructions: "اتصل قبل الوصول",
      }),
      event,
    );

    expect(entries.map((e) => e.label)).toEqual([
      "تعليمات التسليم",
      "بطاقة الإهداء",
      "تعليمات التجهيز",
    ]);
    expect(hasDocumentNotes(baseOrder(), event)).toBe(true);
  });

  it("includes order notes for walk-in sales", () => {
    const entries = collectDocumentNotes(
      baseOrder({ type: "pos", notes: "تغليف هدية" }),
      null,
    );
    expect(entries).toEqual([
      { key: "order", label: "ملاحظات الطلب", text: "تغليف هدية" },
    ]);
  });
});
