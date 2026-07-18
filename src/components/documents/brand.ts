import type { PaymentStatus, Settings } from "@/types";

/**
 * Clean white document system — gold accents matched to logo (#CCA850).
 * Formal documents are true A4 (210×297mm) print-ready.
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

/** True ISO A4 — printable formal documents */
export const DOC_PAGE_A4 = {
  width: "210mm",
  minHeight: "297mm",
} as const;

/** @deprecated use DOC_PAGE_A4 */
export const DOC_PAGE = DOC_PAGE_A4;

export type DocPaperSize = "a4";

export function getDocPage(_size: DocPaperSize = "a4") {
  return DOC_PAGE_A4;
}

/** Transparent / gold logo for white paper */
const DEFAULT_DOC_LOGO = "/images/valentino-logo.png";

function isUsableLogoUrl(url: string | null | undefined): url is string {
  if (!url || !url.trim()) return false;
  const trimmed = url.trim();
  if (trimmed.includes("valentino-logo")) return true;
  if (
    trimmed.startsWith("data:") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return true;
  }
  if (trimmed.startsWith("/images/")) return true;
  return false;
}

export function resolveDocLogoUrl(settings: Settings): string {
  return isUsableLogoUrl(settings.logoUrl) ? settings.logoUrl.trim() : DEFAULT_DOC_LOGO;
}

export function resolveUiLogoUrl(settings: Settings): string {
  return isUsableLogoUrl(settings.logoUrl) ? settings.logoUrl.trim() : DEFAULT_DOC_LOGO;
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

/** Invoice / document payment-status labels (from order.paymentStatus). */
export const ORDER_PAYMENT_STATUS_AR: Record<PaymentStatus, string> = {
  unpaid: "غير مدفوعة",
  partial: "دفعة جزئية",
  paid: "مدفوعة",
  refunded: "مسترجعة",
};

export const ORDER_PAYMENT_STATUS_SHORT_AR: Record<PaymentStatus, string> = {
  unpaid: "غير مدفوعة",
  partial: "جزئية",
  paid: "مدفوعة",
  refunded: "مسترجعة",
};

export function invoicePaymentStatusMeta(status: PaymentStatus): {
  label: string;
  short: string;
  tone: "success" | "warning" | "danger" | "muted";
} {
  switch (status) {
    case "paid":
      return {
        label: ORDER_PAYMENT_STATUS_AR.paid,
        short: ORDER_PAYMENT_STATUS_SHORT_AR.paid,
        tone: "success",
      };
    case "partial":
      return {
        label: ORDER_PAYMENT_STATUS_AR.partial,
        short: ORDER_PAYMENT_STATUS_SHORT_AR.partial,
        tone: "warning",
      };
    case "refunded":
      return {
        label: ORDER_PAYMENT_STATUS_AR.refunded,
        short: ORDER_PAYMENT_STATUS_SHORT_AR.refunded,
        tone: "muted",
      };
    case "unpaid":
    default:
      return {
        label: ORDER_PAYMENT_STATUS_AR.unpaid,
        short: ORDER_PAYMENT_STATUS_SHORT_AR.unpaid,
        tone: "danger",
      };
  }
}

export const PO_STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  sent: "مُرسل",
  partial: "استلام جزئي",
  received: "مُستلم",
  cancelled: "ملغي",
};
