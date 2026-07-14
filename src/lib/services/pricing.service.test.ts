import { describe, expect, it } from "vitest";
import {
  applyTierDiscount,
  calculateLineTotal,
  calculateOrderTotals,
  resolveUnitPrice,
} from "./pricing.service";

describe("pricing.service", () => {
  it("calculates line total with discount", () => {
    expect(calculateLineTotal({ quantity: 2, unitPrice: 50, discount: 10 })).toBe(90);
  });

  it("never returns negative line total", () => {
    expect(calculateLineTotal({ quantity: 1, unitPrice: 10, discount: 20 })).toBe(0);
  });

  it("calculates order totals with tax", () => {
    const result = calculateOrderTotals({
      items: [
        { quantity: 2, unitPrice: 100, discount: 0 },
        { quantity: 1, unitPrice: 50, discount: 0 },
      ],
      discountAmount: 25,
      taxRate: 15,
    });

    expect(result.subtotal).toBe(250);
    expect(result.discountAmount).toBe(25);
    expect(result.taxAmount).toBe(33.75);
    expect(result.total).toBe(258.75);
  });

  it("caps order discount at subtotal", () => {
    const result = calculateOrderTotals({
      items: [{ quantity: 1, unitPrice: 50, discount: 0 }],
      discountAmount: 100,
      taxRate: 0,
    });
    expect(result.discountAmount).toBe(50);
    expect(result.total).toBe(0);
  });

  it("adds delivery pricing after discount and tax", () => {
    const result = calculateOrderTotals({
      items: [{ quantity: 2, unitPrice: 50 }],
      discountAmount: 10,
      deliveryFee: 15,
      taxRate: 10,
    });

    expect(result.deliveryFee).toBe(15);
    expect(result.taxAmount).toBe(9);
    expect(result.total).toBe(114);
  });

  it("resolves wholesale vs retail price", () => {
    expect(resolveUnitPrice(100, 80, false)).toBe(100);
    expect(resolveUnitPrice(100, 80, true)).toBe(80);
  });

  it("applies tier discount", () => {
    expect(applyTierDiscount(100, 10)).toBe(90);
    expect(applyTierDiscount(100, 0)).toBe(100);
  });
});
