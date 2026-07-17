"use client";

import { useRef } from "react";
import { Printer } from "lucide-react";

import { InvoiceThermalTemplate } from "@/components/documents/invoice-thermal-template";
import {
  openPrintWindow,
  thermalPrintStyles,
} from "@/components/documents/print-window";
import { Button } from "@/components/ui/button";
import { getSettings, getState, printInvoice } from "@/lib/data/store";
import { buildDocumentCodeValue } from "@/lib/services/invoice.service";
import type { Order, Payment } from "@/types";

interface PrintReceiptProps {
  order: Order;
  payment?: Payment | null;
  storeName?: string;
  taxRate?: number;
  onPrinted?: () => void;
}

export function PrintReceipt({
  order,
  payment,
  onPrinted,
}: PrintReceiptProps) {
  const settings = getSettings();
  const state = getState();
  const invoice =
    state.invoices.find((item) => item.orderId === order.id) ?? null;
  const event =
    state.events.find((item) => item.orderId === order.id) ?? null;
  const thermalRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = thermalRef.current;
    if (!content) return;
    const ok = openPrintWindow({
      title: `فاتورة ${invoice?.invoiceNumber ?? order.orderNumber}`,
      bodyHtml: content.innerHTML,
      styles: thermalPrintStyles(settings.thermalPaperWidth),
      width: settings.thermalPaperWidth === 58 ? 300 : 420,
      height: 700,
      onAfterOpen: () => {
        if (invoice) printInvoice(invoice.id);
        onPrinted?.();
      },
    });
    if (!ok) return;
  };

  return (
    <>
      <div className="hidden">
        <InvoiceThermalTemplate
          ref={thermalRef}
          invoice={invoice}
          order={order}
          settings={settings}
          payment={payment}
          event={event}
          qrPayload={
            invoice
              ? buildDocumentCodeValue({
                  invoice,
                  order,
                  settings,
                })
              : null
          }
        />
      </div>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrint}>
        <Printer className="size-3.5" />
        طباعة حرارية
      </Button>
    </>
  );
}
