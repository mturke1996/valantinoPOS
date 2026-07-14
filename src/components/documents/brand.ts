import type { Settings } from "@/types";

/**
 * Clean white document system — gold accents matched to logo (#CCA850).
 * No black fills; professional paper look.
 */
export const DOC_INK = {
  text: "#1F1F1F",
  muted: "#667085",
  faint: "#98A2B3",
  border: "#E4E7EC",
  zebra: "#F9FAFB",
  card: "#FFFFFF",
  paleGold: "#FBF8F0",
  white: "#FFFFFF",
  gold: "#CCA850",
  goldBright: "#D4AF37",
  goldDeep: "#A8883A",
  goldLine: "#E8D5A3",
  success: "#0F766E",
  warning: "#B45309",
  danger: "#B91C1C",
  /** Soft header wash */
  mist: "#FCFCFD",
} as const;

/** Paper sizes for formal documents */
export const DOC_PAGE_A4 = {
  width: "210mm",
  minHeight: "297mm",
} as const;

export const DOC_PAGE_A5 = {
  width: "148mm",
  minHeight: "210mm",
} as const;

/** @deprecated prefer DOC_PAGE_A4 / DOC_PAGE_A5 */
export const DOC_PAGE = DOC_PAGE_A4;

export type DocPaperSize = "a4" | "a5";

export function getDocPage(size: DocPaperSize = "a4") {
  return size === "a5" ? DOC_PAGE_A5 : DOC_PAGE_A4;
}

/** Transparent / gold logo for white paper */
export function resolveDocLogoUrl(settings: Settings): string {
  if (!settings.logoUrl || settings.logoUrl.includes("valentino-logo")) {
    return "/images/valentino-logo.png";
  }
  return settings.logoUrl;
}

export function resolveUiLogoUrl(settings: Settings): string {
  if (!settings.logoUrl || settings.logoUrl.includes("valentino-logo")) {
    return "/images/valentino-logo.png";
  }
  return settings.logoUrl;
}

/** Same Arabic stack as rkeaz-group (Cairo UI + Tajawal PDF/print) */
export const DOC_FONT_STACK =
  '"Tajawal", "Cairo", "Segoe UI", Tahoma, Arial, sans-serif';

/** «الرقم ثم د.ل» — مطابق rkeaz formatCurrencyDisplay (بدون bidi) */
export function formatDocMoney(
  amount: number,
  currencySymbol: string,
): string {
  const sign = amount < 0 ? "-" : "";
  const absolute = Math.abs(Number.isFinite(amount) ? amount : 0);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absolute);
  return `${sign}${formatted}\u00A0${currencySymbol}`;
}

export const PAYMENT_LABELS = {
  cash: "نقدي",
  card: "بطاقة",
  transfer: "تحويل",
  mixed: "مختلط",
  credit: "آجل",
} as const;

export const PO_STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  sent: "مُرسل",
  partial: "استلام جزئي",
  received: "مُستلم",
  cancelled: "ملغي",
};
