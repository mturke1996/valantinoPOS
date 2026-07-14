import { describe, expect, it } from "vitest";
import { LIBYA_LOCALE } from "@/lib/constants/locale";
import { formatCurrency, formatNumber, roundMoney } from "./utils";

describe("utils", () => {
  it("formats currency as amount then symbol (rkeaz Arabic pattern)", () => {
    const formatted = formatCurrency(1234.5, LIBYA_LOCALE.currency, LIBYA_LOCALE.locale);
    expect(formatted).toMatch(/1[.,\s]?234/);
    expect(formatted).toMatch(/د\.ل$/);
    expect(formatted).not.toMatch(/[٠-٩]/);
    expect(formatted.search(/\d/)).toBeLessThan(formatted.indexOf("د.ل"));
  });

  it("formats numbers with latin digits", () => {
    const formatted = formatNumber(1500);
    expect(formatted).toMatch(/1[.,]?500/);
    expect(formatted).not.toMatch(/[٠-٩]/);
  });

  it("rounds money to 2 decimals", () => {
    expect(roundMoney(10.556)).toBe(10.56);
    expect(roundMoney(10.554)).toBe(10.55);
  });
});
