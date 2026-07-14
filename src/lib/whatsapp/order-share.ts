import {
  orderTypeLabel,
  scheduleTitle,
} from "@/components/documents/doc-order-meta";
import { formatMoneyLabel } from "@/lib/formatters";
import { formatDate } from "@/lib/utils";
import type {
  Customer,
  Event,
  Invoice,
  Order,
  Settings,
} from "@/types";

const PAYMENT_STATUS_AR: Record<string, string> = {
  unpaid: "غير مدفوع",
  partial: "مدفوع جزئياً",
  paid: "مدفوع بالكامل",
  refunded: "مسترجع",
};

/** wa.me URLs break when the query string is too long */
const WHATSAPP_TEXT_MAX = 1600;

/** Normalize Libyan / international phone for wa.me */
export function normalizeWhatsAppPhone(
  raw: string | null | undefined,
  countryCode: string,
): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  // Strip leading zeros after country code duplicates
  if (digits.startsWith("00")) digits = digits.slice(2);

  if (digits.startsWith(countryCode)) return digits;

  // Local Libya: 09xxxxxxxx → 2189xxxxxxxx
  digits = digits.replace(/^0+/, "");
  if (!digits) return null;
  return `${countryCode}${digits}`;
}

export function resolveOrderWhatsAppPhone(
  order: Order,
  customer: Customer | null | undefined,
  countryCode: string,
): string | null {
  return normalizeWhatsAppPhone(
    customer?.whatsapp ||
      customer?.phone ||
      order.deliveryPhone ||
      null,
    countryCode,
  );
}

/**
 * Rich Arabic WhatsApp message for an order — no system / app URLs.
 */
export function buildOrderWhatsAppMessage(input: {
  order: Order;
  settings: Settings;
  customer?: Customer | null;
  event?: Event | null;
  invoice?: Invoice | null;
}): string {
  const { order, settings, customer, event, invoice } = input;
  const balance = Math.max(0, order.total - order.paidAmount);
  const name =
    customer?.name?.trim() ||
    order.deliveryRecipientName?.trim() ||
    "عميلنا العزيز";

  const lines: string[] = [
    `السلام عليكم ${name}`,
    "",
    `*${settings.branchName}*`,
    `تفاصيل طلبكم جاهزة`,
    "",
    `رقم الطلب: *${order.orderNumber}*`,
  ];

  if (invoice?.invoiceNumber) {
    lines.push(`رقم الفاتورة: *${invoice.invoiceNumber}*`);
  }

  lines.push(`نوع الطلب: ${orderTypeLabel(order, event)}`);

  if (order.deliveryDate) {
    lines.push(
      `${scheduleTitle(order)}: ${formatDate(order.deliveryDate, "EEEE d MMMM yyyy")}${
        order.deliveryTime ? ` · الساعة ${order.deliveryTime}` : ""
      }`,
    );
  }

  if (order.deliveryRecipientName) {
    lines.push(`المستلم: ${order.deliveryRecipientName}`);
  }
  if (order.deliveryPhone) {
    lines.push(`هاتف التوصيل: ${order.deliveryPhone}`);
  }
  if (order.deliveryZone) {
    lines.push(`المنطقة: ${order.deliveryZone}`);
  }
  if (order.deliveryAddress) {
    lines.push(`العنوان: ${order.deliveryAddress}`);
  }
  if (order.deliveryInstructions) {
    lines.push(`تعليمات: ${order.deliveryInstructions}`);
  }

  lines.push("", "*الأصناف:*");
  for (const item of order.items) {
    const unit = formatMoneyLabel(item.unitPrice, settings);
    const total = formatMoneyLabel(item.total, settings);
    lines.push(`• ${item.productNameAr}`);
    lines.push(`   ${item.quantity} × ${unit} = ${total}`);
    if (item.notes) lines.push(`   ملاحظة: ${item.notes}`);
  }

  lines.push("");
  lines.push(`المجموع الفرعي: ${formatMoneyLabel(order.subtotal, settings)}`);
  if (order.discountAmount > 0) {
    lines.push(
      `الخصم: − ${formatMoneyLabel(order.discountAmount, settings)}`,
    );
  }
  if (order.taxAmount > 0) {
    lines.push(
      `الضريبة (${settings.taxRate}%): ${formatMoneyLabel(order.taxAmount, settings)}`,
    );
  }
  if (order.deliveryFee > 0) {
    lines.push(
      `رسوم التوصيل: ${formatMoneyLabel(order.deliveryFee, settings)}`,
    );
  } else if (order.type === "delivery") {
    lines.push("رسوم التوصيل: مجاني");
  }

  lines.push(`*الإجمالي: ${formatMoneyLabel(order.total, settings)}*`);
  lines.push(
    `المدفوع: ${formatMoneyLabel(order.paidAmount, settings)} (${PAYMENT_STATUS_AR[order.paymentStatus] ?? order.paymentStatus})`,
  );
  if (balance > 0) {
    lines.push(`*المتبقي: ${formatMoneyLabel(balance, settings)}*`);
  } else {
    lines.push("الحالة المالية: مسدّد بالكامل");
  }

  if (order.notes) {
    lines.push("", `ملاحظات الطلب: ${order.notes}`);
  }
  if (event?.giftCardMessage) {
    lines.push(`رسالة البطاقة: ${event.giftCardMessage}`);
  }
  if (event?.specialNotes) {
    lines.push(`ملاحظات المناسبة: ${event.specialNotes}`);
  }

  if (settings.branchPhone) {
    lines.push("", `للتواصل: ${settings.branchPhone}`);
  }
  if (settings.invoiceFooter?.trim()) {
    lines.push(settings.invoiceFooter.trim());
  }

  lines.push("", "مرفق فاتورة PDF للتفاصيل الكاملة.");

  return lines.join("\n");
}

export function truncateWhatsAppText(message: string, max = WHATSAPP_TEXT_MAX): string {
  if (message.length <= max) return message;
  const cut = message.slice(0, max - 40);
  return `${cut}\n\n…(اختُصر النص — التفاصيل في ملف PDF)`;
}

export function isMobileUserAgent(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent ?? "");
}

/** Open wa.me without losing the click gesture (popup blockers). Returns true if a
 * window/anchor was used to open the chat. */
export function openWhatsAppChat(
  phone: string,
  message: string,
  preOpened?: Window | null,
): boolean {
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(
    truncateWhatsAppText(message),
  )}`;

  if (preOpened && !preOpened.closed) {
    try {
      preOpened.location.href = url;
      return true;
    } catch {
      /* cross-origin — fall through to a fresh open */
    }
  }

  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (opened) return true;

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  return true;
}

/** True when the current navigator can share an actual PDF file (mobile Web Share). */
export function canShareFiles(file: File): boolean {
  if (typeof navigator === "undefined") return false;
  if (typeof navigator.share !== "function") return false;
  if (typeof navigator.canShare !== "function") return true;
  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

export async function shareOrderPdfOnWhatsApp(options: {
  file: File;
  message: string;
  phone: string | null;
  fileName: string;
  onDownloadFallback?: (blob: Blob, fileName: string) => void;
  /** Window opened synchronously on click to dodge popup blockers */
  preOpenedWindow?: Window | null;
}): Promise<"shared" | "whatsapp_text" | "download_only"> {
  const {
    file,
    message,
    phone,
    fileName,
    onDownloadFallback,
    preOpenedWindow,
  } = options;

  // Web Share with files is reliable mainly on mobile; desktop often claims
  // support then fails or never opens WhatsApp — so we gate on mobile.
  if (isMobileUserAgent() && canShareFiles(file)) {
    try {
      const sharePayload: ShareData = {
        title: fileName.replace(/\.pdf$/i, ""),
        text: message,
        files: [file],
      };
      await navigator.share(sharePayload);
      preOpenedWindow?.close();
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        preOpenedWindow?.close();
        throw error;
      }
      // Fall through to wa.me + download.
    }
  }

  onDownloadFallback?.(file, fileName);

  if (phone) {
    openWhatsAppChat(phone, message, preOpenedWindow);
    return "whatsapp_text";
  }

  preOpenedWindow?.close();
  return "download_only";
}
