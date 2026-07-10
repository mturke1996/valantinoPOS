import type { Invoice, Order, Settings } from "@/types";
import { roundMoney } from "@/lib/utils";

export function buildInvoiceQrPayload(input: {
  invoice: Invoice;
  order: Order;
  settings: Settings;
}): string {
  const { invoice, order, settings } = input;
  const payload = {
    seller: settings.branchName,
    vat: settings.taxRate,
    currency: settings.currency,
    invoiceNumber: invoice.invoiceNumber,
    orderNumber: order.orderNumber,
    total: roundMoney(order.total),
    taxAmount: roundMoney(order.taxAmount),
    issuedAt: invoice.createdAt,
  };
  return JSON.stringify(payload);
}
