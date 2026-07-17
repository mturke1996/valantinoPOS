import { describe, expect, it } from "vitest";

import {
  buildTelegramPreviewMessage,
  escapeHtml,
  formatEventReminderMessage,
  formatOrderCreatedMessage,
  formatPaymentMessage,
  formatUpcomingDigest,
} from "@/lib/telegram/messages";

describe("telegram message formatting", () => {
  it("escapes html entities", () => {
    expect(escapeHtml("A < B & C > D")).toBe("A &lt; B &amp; C &gt; D");
  });

  it("formats new order messages in Arabic", () => {
    const text = formatOrderCreatedMessage({
      typeLabel: "مناسبة",
      orderNumber: "VAL-12",
      customerName: "ليلى",
      total: 350.5,
      currencySymbol: "د.ل",
      deliveryDate: "2026-07-20",
      deliveryTime: "16:00",
      itemCount: 4,
    });
    expect(text).toContain("مناسبة جديد");
    expect(text).toContain("VAL-12");
    expect(text).toContain("ليلى");
    expect(text).toContain("2026-07-20");
  });

  it("formats payment messages", () => {
    const text = formatPaymentMessage({
      orderNumber: "VAL-12",
      amount: 100,
      currencySymbol: "د.ل",
      paymentStatus: "partial",
    });
    expect(text).toContain("تحصيل دفعة");
    expect(text).toContain("دفعة جزئية");
  });

  it("formats event reminder messages for 3d/2d/1d", () => {
    const threeDays = formatEventReminderMessage({
      offsetKey: "3d",
      orderNumber: "VAL-3",
      customerName: "نورة",
      deliveryDate: "2026-07-20",
      deliveryTime: "17:00",
      deliveryAddress: "طرابلس",
      itemSummary: "علبة فاخرة ×1",
      itemCount: 1,
      balance: 50,
      currencySymbol: "د.ل",
    });
    expect(threeDays).toContain("قبل 3 أيام");
    expect(threeDays).toContain("VAL-3");

    const twoDays = formatEventReminderMessage({
      offsetKey: "2d",
      orderNumber: "VAL-2",
      customerName: "نورة",
      deliveryDate: "2026-07-19",
      deliveryTime: null,
      deliveryAddress: null,
      itemSummary: "شوكولاتة ×2",
      itemCount: 2,
      balance: 0,
      currencySymbol: "د.ل",
    });
    expect(twoDays).toContain("قبل يومين");
  });

  it("formats upcoming digests", () => {
    const empty = formatUpcomingDigest([]);
    expect(empty).toContain("لا توجد مناسبات");

    const digest = formatUpcomingDigest([
      {
        orderNumber: "VAL-1",
        customerName: "سارة",
        deliveryDate: "2026-07-18",
        deliveryTime: "11:00",
        countdownLabel: "غداً",
        urgencyLabel: "غداً",
      },
    ]);
    expect(digest).toContain("المناسبات القادمة");
    expect(digest).toContain("VAL-1");
  });

  it("builds preview samples for settings UI", () => {
    expect(buildTelegramPreviewMessage("reminder_3d")).toContain("قبل 3 أيام");
    expect(buildTelegramPreviewMessage("order")).toContain("طلب");
    expect(buildTelegramPreviewMessage("digest")).toContain("المناسبات القادمة");
  });
});
