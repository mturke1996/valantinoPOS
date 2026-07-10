import { describe, expect, it } from "vitest";

import { createSeedState } from "@/lib/data/seed";
import { getDashboardStats } from "@/lib/services/dashboard.service";

describe("getDashboardStats", () => {
  it("derives the weekly chart from actual completed orders", () => {
    const stats = getDashboardStats(createSeedState());

    expect(stats.salesByDay).toHaveLength(7);
    expect(
      stats.salesByDay.reduce((sum, day) => sum + day.sales, 0),
    ).toBe(stats.weekSales);
    expect(stats.salesByDay.every((day) => day.date.length === 10)).toBe(true);
  });

  it("never invents a percentage delta without a comparison period", () => {
    const state = createSeedState();
    state.orders = [];

    const stats = getDashboardStats(state);

    expect(stats.todaySales).toBe(0);
    expect(stats.todaySalesDelta).toBeNull();
    expect(stats.weekSalesDelta).toBeNull();
  });
});
