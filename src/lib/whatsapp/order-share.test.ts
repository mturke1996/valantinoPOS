import { afterEach, describe, expect, it, vi } from "vitest";

import { shareOrderPdfOnWhatsApp } from "@/lib/whatsapp/order-share";

describe("shareOrderPdfOnWhatsApp", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns shared when Web Share API accepts files", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
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

  it("falls back to wa.me text + download when share unavailable", async () => {
    const open = vi.fn();
    vi.stubGlobal("navigator", {});
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
    expect(onDownloadFallback).toHaveBeenCalledOnce();
    expect(open).toHaveBeenCalledWith(
      expect.stringContaining("https://wa.me/218912345678"),
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("returns download_only when no phone and no share", async () => {
    vi.stubGlobal("navigator", {});
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
