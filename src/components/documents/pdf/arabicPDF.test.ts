import { describe, expect, it } from "vitest";

import {
  ar,
  arDate,
  arDateLong,
  arDateTime,
  arMoney,
} from "@/components/documents/pdf/arabicPDF";
import { toPdfPaperSize } from "@/components/documents/pdf/pdfService";
import { invoicePaymentStatusMeta } from "@/components/documents/brand";
import { isAllowedLogoUrl } from "@/components/documents/pdf/pdfAssets";
import { createDocumentPdf } from "@/components/documents/pdf-export";

describe("arabicPDF", () => {
  it("formats money with sign and currency", () => {
    expect(arMoney(1234.5, "د.ل")).toBe("1,234.50\u00A0د.ل");
    expect(arMoney(-10, "د.ل")).toBe("-10.00\u00A0د.ل");
  });

  it("formats date-only strings at local noon", () => {
    expect(arDate("2026-07-14")).toMatch(/^\d{2}\/\d{2}\/2026$/);
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

  it("formats long Arabic weekday dates", () => {
    const long = arDateLong("2026-07-14");
    expect(long).not.toBe("—");
    expect(long.length).toBeGreaterThan(10);
  });
});

describe("toPdfPaperSize", () => {
  it("maps ui sizes to react-pdf sizes", () => {
    expect(toPdfPaperSize("a5")).toBe("A5");
    expect(toPdfPaperSize("a4")).toBe("A4");
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
