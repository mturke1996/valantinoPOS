import type { Invoice, Order, Settings } from "@/types";
import { roundMoney } from "@/lib/utils";

export type DocumentCodeMode = Settings["documentCodeMode"];

const TEMPLATE_TOKENS = [
  "{orderNumber}",
  "{invoiceNumber}",
  "{total}",
  "{phone}",
  "{branchName}",
  "{taxNumber}",
  "{commercialRegister}",
] as const;

/** Replace placeholders in custom QR / barcode content. */
export function applyDocumentCodeTemplate(
  template: string,
  input: { invoice: Invoice; order: Order; settings: Settings },
): string {
  const { invoice, order, settings } = input;
  return template
    .replaceAll("{orderNumber}", order.orderNumber)
    .replaceAll("{invoiceNumber}", invoice.invoiceNumber)
    .replaceAll("{total}", String(roundMoney(order.total)))
    .replaceAll("{phone}", settings.branchPhone || "")
    .replaceAll("{branchName}", settings.branchName || "")
    .replaceAll("{taxNumber}", settings.taxNumber || "")
    .replaceAll("{commercialRegister}", settings.commercialRegister || "");
}

export function listDocumentCodeTokens(): readonly string[] {
  return TEMPLATE_TOKENS;
}

/**
 * Value encoded into the PDF / receipt QR (or barcode text).
 * Returns null when the code is disabled in settings.
 */
export function buildDocumentCodeValue(input: {
  invoice: Invoice;
  order: Order;
  settings: Settings;
}): string | null {
  const { invoice, order, settings } = input;

  if (settings.documentCodeEnabled === false) {
    return null;
  }

  const mode = settings.documentCodeMode ?? "invoice_data";

  switch (mode) {
    case "hidden":
      return null;
    case "order_number":
      return order.orderNumber;
    case "invoice_number":
      return invoice.invoiceNumber;
    case "custom_url":
    case "custom_text": {
      const raw = settings.documentCodeCustomValue?.trim() ?? "";
      if (!raw) return null;
      return applyDocumentCodeTemplate(raw, input);
    }
    case "invoice_data":
    default: {
      const payload = {
        v: 1,
        seller: settings.branchName,
        taxNumber: settings.taxNumber,
        commercialRegister: settings.commercialRegister,
        address: settings.branchAddress,
        phone: settings.branchPhone,
        vatRate: settings.taxRate,
        currency: settings.currency,
        invoiceNumber: invoice.invoiceNumber,
        orderNumber: order.orderNumber,
        subtotal: roundMoney(order.subtotal),
        discount: roundMoney(order.discountAmount),
        taxAmount: roundMoney(order.taxAmount),
        total: roundMoney(order.total),
        paidAmount: roundMoney(order.paidAmount),
        paymentStatus: order.paymentStatus,
        issuedAt: invoice.createdAt,
      };
      return JSON.stringify(payload);
    }
  }
}

/**
 * Structured invoice QR payload — ready for tax/e-invoice readers.
 * @deprecated Prefer buildDocumentCodeValue; kept for call-site compatibility.
 */
export function buildInvoiceQrPayload(input: {
  invoice: Invoice;
  order: Order;
  settings: Settings;
}): string {
  return buildDocumentCodeValue(input) ?? "";
}
