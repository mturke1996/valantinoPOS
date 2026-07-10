"use client";

import { useRef } from "react";
import { Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { CurrencyDisplay } from "@/components/shared/currency-display";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getSettings } from "@/lib/data/store";
import { formatDate } from "@/lib/utils";
import type { Invoice, Order } from "@/types";

interface InvoicePrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice;
  order: Order;
}

export function InvoicePrintDialog({
  open,
  onOpenChange,
  invoice,
  order,
}: InvoicePrintDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const settings = getSettings();

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank", "noopener,noreferrer,width=420,height=640");
    if (!win) return;
    win.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <title>${invoice.invoiceNumber}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 16px; color: #1a1a1a; }
            h1 { font-size: 18px; margin: 0 0 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            td, th { padding: 6px 4px; border-bottom: 1px solid #e5e5e5; text-align: right; font-size: 13px; }
            .meta { font-size: 12px; color: #555; line-height: 1.6; }
            .total { font-weight: 700; font-size: 15px; }
          </style>
        </head>
        <body>${content.innerHTML}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>فاتورة {invoice.invoiceNumber}</DialogTitle>
        </DialogHeader>

        <div ref={printRef} className="space-y-4 rounded-lg border p-4">
          <div className="text-center">
            <h2 className="text-lg font-semibold">{settings.branchName}</h2>
            <p className="text-sm text-muted-foreground">{settings.branchAddress}</p>
            <p className="text-sm text-muted-foreground">{settings.branchPhone}</p>
          </div>

          <div className="meta space-y-1">
            <p>رقم الفاتورة: {invoice.invoiceNumber}</p>
            <p>رقم الطلب: {order.orderNumber}</p>
            <p>التاريخ: {formatDate(invoice.createdAt)}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>الصنف</th>
                <th>الكمية</th>
                <th>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.productNameAr}</td>
                  <td>{item.quantity}</td>
                  <td>
                    <CurrencyDisplay amount={item.total} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>الضريبة</span>
              <CurrencyDisplay amount={order.taxAmount} />
            </div>
            <div className="flex justify-between total">
              <span>الإجمالي</span>
              <CurrencyDisplay amount={order.total} />
            </div>
          </div>

          {invoice.qrPayload ? (
            <div className="flex justify-center pt-2">
              <QRCodeSVG value={invoice.qrPayload} size={120} />
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button onClick={handlePrint}>
            <Printer className="ms-2 h-4 w-4" />
            طباعة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
