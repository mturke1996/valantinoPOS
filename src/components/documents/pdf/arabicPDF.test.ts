import { describe, expect, it } from "vitest";

import {
  ar,
  arDate,
  arDateLong,
  arDateTime,
  arMixed,
  arMoney,
  hasArabic,
  ltr,
  LTR_MARK,
  pdfDisplayValue,
} from "@/components/documents/pdf/arabicPDF";
import { toPdfPaperSize } from "@/components/documents/pdf/pdfService";
import { invoicePaymentStatusMeta } from "@/components/documents/brand";
import { isAllowedLogoUrl } from "@/components/documents/pdf/pdfAssets";
import { createDocumentPdf } from "@/components/documents/pdf-export";

describe("arabicPDF", () => {
  it("formats money with LTR isolation and currency", () => {
    const money = arMoney(1234.5, "د.ل");
    expect(money).toContain("1,234.50");
    expect(money).toContain("د.ل");
    expect(money.startsWith(LTR_MARK)).toBe(true);
    expect(arMoney(-10, "د.ل")).toContain("-10.00");
  });

  it("formats date-only strings at local noon as LTR", () => {
    const d = arDate("2026-07-14");
    expect(d).toMatch(/\d{2}\/\d{2}\/2026/);
    expect(d.includes(LTR_MARK)).toBe(true);
  });

  it("returns em dash for invalid dates", () => {
    expect(arDate("not-a-date")).toBe("—");
    expect(arDateTime("nope")).toBe("—");
    expect(arDateLong("invalid")).toBe("—");
  });

  it("passes through Arabic text", () => {
    expect(ar("فاتورة")).toBe("فاتورة");
    expect(ar(null)).toBe("");
  });

  it("isolates Latin/digit runs inside Arabic (arMixed)", () => {
    const mixed = arMixed("صنف VAL-123 فاخر");
    expect(mixed).toContain("صنف");
    expect(mixed).toContain(`${LTR_MARK}VAL-123${LTR_MARK}`);
    expect(mixed).toContain("فاخر");
  });

  it("ltr wraps phones and SKUs", () => {
    expect(ltr("0912345678")).toBe(`${LTR_MARK}0912345678${LTR_MARK}`);
  });

  it("pdfDisplayValue routes pure Arabic / mixed / Latin", () => {
    expect(pdfDisplayValue("شوكولاتة")).toBe("شوكولاتة");
    expect(pdfDisplayValue("صنف A1")).toContain(LTR_MARK);
    expect(pdfDisplayValue("SKU-9")).toBe(`${LTR_MARK}SKU-9${LTR_MARK}`);
  });

  it("detects Arabic script", () => {
    expect(hasArabic("فاتورة")).toBe(true);
    expect(hasArabic("INV-1")).toBe(false);
  });

  it("formats long Arabic weekday dates", () => {
    const long = arDateLong("2026-07-14");
    expect(long).not.toBe("—");
    expect(long.length).toBeGreaterThan(10);
  });
});

describe("toPdfPaperSize", () => {
  it("maps formal paper to A4 only", () => {
    expect(toPdfPaperSize("a4")).toBe("A4");
    expect(toPdfPaperSize()).toBe("A4");
  });
});

describe("invoicePaymentStatusMeta", () => {
  it("labels unpaid distinctly from partial", () => {
    expect(invoicePaymentStatusMeta("unpaid").label).toBe("غير مدفوعة");
    expect(invoicePaymentStatusMeta("partial").label).toBe("دفعة جزئية");
    expect(invoicePaymentStatusMeta("paid").label).toBe("مدفوعة");
    expect(invoicePaymentStatusMeta("refunded").label).toBe("مسترجعة");
  });
});

describe("isAllowedLogoUrl", () => {
  it("allows relative, data, and known hosts", () => {
    expect(isAllowedLogoUrl("/images/logo.png")).toBe(true);
    expect(isAllowedLogoUrl("data:image/png;base64,abc")).toBe(true);
    expect(isAllowedLogoUrl("https://i.ibb.co/x/y.png")).toBe(true);
    expect(isAllowedLogoUrl("https://xyz.supabase.co/storage/v1/obj")).toBe(
      true,
    );
  });

  it("rejects arbitrary remote urls", () => {
    expect(isAllowedLogoUrl("https://evil.example/steal.png")).toBe(false);
    expect(isAllowedLogoUrl("ftp://files.example/a.png")).toBe(false);
  });
});

describe("resolveDocLogoUrl", () => {
  it("falls back for stale local paths like TajMall-Icon", async () => {
    const { resolveDocLogoUrl } = await import("@/components/documents/brand");
    const base = { logoUrl: "/TajMall-Icon.jpg" } as never;
    expect(resolveDocLogoUrl(base)).toBe("/images/valentino-logo.png");
    expect(
      resolveDocLogoUrl({ logoUrl: "/images/custom-branch.png" } as never),
    ).toBe("/images/custom-branch.png");
  });
});

describe("createDocumentPdf", () => {
  it("throws a clear migration error", () => {
    expect(() => createDocumentPdf()).toThrow(/removed/i);
  });
});
