"use client";

import { useCallback, useState } from "react";
import { Printer, Receipt } from "lucide-react";

import { InvoicePrintDialog } from "@/components/invoices/invoice-print-dialog";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useStoreSubscription } from "@/hooks/use-store-subscription";
import { getOrders, getState, printInvoice } from "@/lib/data/store";
import { formatDate } from "@/lib/utils";
import type { Invoice, Order } from "@/types";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<
    Array<{ invoice: Invoice; order?: Order }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [printTarget, setPrintTarget] = useState<{
    invoice: Invoice;
    order: Order;
  } | null>(null);

  const refresh = useCallback(() => {
    const state = getState();
    const orderMap = new Map(getOrders().map((o) => [o.id, o]));
    setInvoices(
      state.invoices.map((invoice) => ({
        invoice,
        order: orderMap.get(invoice.orderId),
      })),
    );
    setLoading(false);
  }, []);

  useStoreSubscription(refresh);

  const handlePrint = (invoice: Invoice, order?: Order) => {
    if (!order) return;
    const updated = printInvoice(invoice.id) ?? invoice;
    setPrintTarget({ invoice: updated, order });
    refresh();
  };

  if (loading) {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      <PageHeader title="الفواتير" description={`${invoices.length} فاتورة`} />

      {invoices.length === 0 ? (
        <EmptyState icon={Receipt} title="لا توجد فواتير" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-cacao-800/8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-start font-medium">رقم الفاتورة</th>
                <th className="p-3 text-start font-medium">رقم الطلب</th>
                <th className="p-3 text-start font-medium">المبلغ</th>
                <th className="p-3 text-start font-medium">تاريخ الإصدار</th>
                <th className="p-3 text-start font-medium">طباعة</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(({ invoice, order }) => (
                <tr key={invoice.id} className="border-b border-cacao-800/6">
                  <td className="p-3 font-medium">{invoice.invoiceNumber}</td>
                  <td className="p-3">{order?.orderNumber ?? "—"}</td>
                  <td className="p-3">
                    {order ? (
                      <CurrencyDisplay amount={order.total} />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {formatDate(invoice.createdAt)}
                  </td>
                  <td className="p-3">
                    {order ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePrint(invoice, order)}
                      >
                        <Printer className="ms-1 h-4 w-4" />
                        {invoice.printedAt
                          ? formatDate(invoice.printedAt)
                          : "طباعة"}
                      </Button>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {printTarget ? (
        <InvoicePrintDialog
          open
          onOpenChange={(open) => {
            if (!open) setPrintTarget(null);
          }}
          invoice={printTarget.invoice}
          order={printTarget.order}
        />
      ) : null}
    </div>
  );
}
