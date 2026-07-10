import { describe, expect, it } from "vitest";
import {
  calculateEarnedPoints,
  getTier,
  redeemPoints,
} from "./loyalty.service";
import type { Customer } from "@/types";

const baseCustomer: Customer = {
  id: "c1",
  branchId: "br1",
  name: "عميل تجريبي",
  phone: "0500000000",
  whatsapp: null,
  email: null,
  notes: null,
  birthday: null,
  loyaltyTierId: "tier-bronze",
  loyaltyPoints: 100,
  totalSpent: 0,
  orderCount: 0,
  lastOrderAt: null,
  wholesalePricing: false,
  deletedAt: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

describe("loyalty.service", () => {
  it("calculates earned points from order total", () => {
    expect(calculateEarnedPoints(250, 0.1)).toBe(25);
    expect(calculateEarnedPoints(99, 0.1)).toBe(9);
  });

  it("resolves tier by points", () => {
    expect(getTier(0).key).toBe("bronze");
    expect(getTier(500).key).toBe("silver");
    expect(getTier(10000).key).toBe("diamond");
  });

  it("redeems points without going negative", () => {
    const result = redeemPoints({
      customer: baseCustomer,
      points: 30,
    });
    expect(result.customer.loyaltyPoints).toBe(70);
    expect(result.log.points).toBe(-30);
  });

  it("handles insufficient points on redeem", () => {
    const result = redeemPoints({
      customer: { ...baseCustomer, loyaltyPoints: 10 },
      points: 30,
    });
    expect(result.customer.loyaltyPoints).toBe(0);
    expect(result.log.points).toBe(-10);
  });
});
