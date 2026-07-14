import type { Invoice, Order, Settings } from "@/types";
import { roundMoney } from "@/lib/utils";

/**
 * Structured invoice QR payload — ready for tax/e-invoice readers.
 * Includes seller identifiers when configured in settings.
 */
export function buildInvoiceQrPayload(input: {
  invoice: Invoice;
  order: Order;
  settings: Settings;
}): string {
  const { invoice, order, settings } = input;
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
