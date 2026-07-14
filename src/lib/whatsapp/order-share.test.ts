import { afterEach, describe, expect, it, vi } from "vitest";

import {
  shareOrderPdfOnWhatsApp,
  truncateWhatsAppText,
} from "@/lib/whatsapp/order-share";

describe("shareOrderPdfOnWhatsApp", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses Web Share on mobile when files are supported", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      userAgent: "iPhone",
      share,
      canShare: () => true,
    });

    const file = new File(["%PDF"], "inv.pdf", { type: "application/pdf" });
    const result = await shareOrderPdfOnWhatsApp({
      file,
      message: "hello",
      phone: "218912345678",
      fileName: "inv.pdf",
    });

    expect(result).toBe("shared");
    expect(share).toHaveBeenCalledOnce();
  });

  it("opens wa.me on desktop instead of Web Share", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const open = vi.fn().mockReturnValue({ closed: false, location: { href: "" } });
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Windows NT 10.0)",
      share,
      canShare: () => true,
    });
    vi.stubGlobal("window", { open });

    const onDownloadFallback = vi.fn();
    const file = new File(["%PDF"], "inv.pdf", { type: "application/pdf" });
    const result = await shareOrderPdfOnWhatsApp({
      file,
      message: "hello",
      phone: "218912345678",
      fileName: "inv.pdf",
      onDownloadFallback,
    });

    expect(result).toBe("whatsapp_text");
    expect(share).not.toHaveBeenCalled();
    expect(onDownloadFallback).toHaveBeenCalledOnce();
    expect(open).toHaveBeenCalledWith(
      expect.stringContaining("https://wa.me/218912345678"),
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("uses preOpened window location to avoid popup blockers", async () => {
    const preOpened = { closed: false, location: { href: "about:blank" } };
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (Windows NT 10.0)" });

    const onDownloadFallback = vi.fn();
    const file = new File(["%PDF"], "inv.pdf", { type: "application/pdf" });
    const result = await shareOrderPdfOnWhatsApp({
      file,
      message: "hello",
      phone: "218912345678",
      fileName: "inv.pdf",
      onDownloadFallback,
      preOpenedWindow: preOpened as unknown as Window,
    });

    expect(result).toBe("whatsapp_text");
    expect(preOpened.location.href).toContain("https://wa.me/218912345678");
  });

  it("returns download_only when no phone and no share", async () => {
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (Windows NT 10.0)" });
    const onDownloadFallback = vi.fn();
    const file = new File(["%PDF"], "inv.pdf", { type: "application/pdf" });
    const result = await shareOrderPdfOnWhatsApp({
      file,
      message: "hello",
      phone: null,
      fileName: "inv.pdf",
      onDownloadFallback,
    });

    expect(result).toBe("download_only");
    expect(onDownloadFallback).toHaveBeenCalledOnce();
  });
});

describe("truncateWhatsAppText", () => {
  it("shortens long messages for wa.me", () => {
    const long = "س".repeat(2000);
    const out = truncateWhatsAppText(long, 100);
    expect(out.length).toBeLessThanOrEqual(120);
    expect(out).toContain("PDF");
  });
});
