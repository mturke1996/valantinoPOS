import { describe, expect, it } from "vitest";

import {
  applyDocumentCodeTemplate,
  buildDocumentCodeValue,
} from "@/lib/services/invoice.service";
import { createInitialState } from "@/lib/data/initial-state";
import type { Invoice, Order } from "@/types";

function sample() {
  const settings = createInitialState().settings;
  const now = new Date().toISOString();
  const order: Order = {
    id: "o1",
    branchId: settings.branchId,
    orderNumber: "VAL-99",
    customerId: null,
    type: "pos",
    status: "completed",
    items: [],
    subtotal: 50,
    discountAmount: 0,
    taxAmount: 0,
    total: 50,
    paidAmount: 50,
    paymentStatus: "paid",
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
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  const invoice: Invoice = {
    id: "i1",
    orderId: order.id,
    invoiceNumber: "INV-99",
    qrPayload: null,
    printedAt: null,
    createdAt: now,
  };
  return { settings, order, invoice };
}

describe("document code settings", () => {
  it("builds invoice JSON by default", () => {
    const { settings, order, invoice } = sample();
    const value = buildDocumentCodeValue({ settings, order, invoice });
    expect(value).toContain("VAL-99");
    expect(value).toContain("INV-99");
  });

  it("returns null when disabled", () => {
    const { settings, order, invoice } = sample();
    const value = buildDocumentCodeValue({
      settings: { ...settings, documentCodeEnabled: false },
      order,
      invoice,
    });
    expect(value).toBeNull();
  });

  it("supports order number mode and custom templates", () => {
    const { settings, order, invoice } = sample();
    expect(
      buildDocumentCodeValue({
        settings: { ...settings, documentCodeMode: "order_number" },
        order,
        invoice,
      }),
    ).toBe("VAL-99");

    const custom = applyDocumentCodeTemplate(
      "https://t.me/x?start={orderNumber}",
      { settings, order, invoice },
    );
    expect(custom).toBe("https://t.me/x?start=VAL-99");
  });
});
