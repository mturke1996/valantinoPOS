"use client";

import { useRef } from "react";
import { Printer } from "lucide-react";

import { CurrencyDisplay } from "@/components/shared/currency-display";
import { Button } from "@/components/ui/button";
import type { Order, Payment, PaymentMethod } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { getSettings } from "@/lib/data/store";

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: "نقدي",
  card: "بطاقة",
  transfer: "تحويل",
  mixed: "مختلط",
  credit: "آجل",
};

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
  storeName = "Valentino Chocolate",
  taxRate = getSettings().taxRate,
  onPrinted,
}: PrintReceiptProps) {
  const settings = getSettings();
  const ref = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = ref.current;
    if (!content) return;
    const win = window.open("", "_blank", "width=320,height=600");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <title>فاتورة ${order.orderNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; width: 80mm; padding: 8px; font-size: 12px; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed #000; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; margin: 2px 0; }
          .total { font-size: 14px; font-weight: bold; }
          .tabular { font-variant-numeric: tabular-nums; }
        </style>
      </head>
      <body>${content.innerHTML}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
    onPrinted?.();
  };

  return (
    <>
      <div ref={ref} className="hidden">
        <div className="center bold" style={{ fontSize: 14, marginBottom: 4 }}>
          {storeName}
        </div>
        <div className="center" style={{ marginBottom: 8 }}>
          فاتورة ضريبية مبسطة
        </div>
        <div className="line" />
        <div className="row">
          <span>رقم الفاتورة:</span>
          <span className="tabular">{order.orderNumber}</span>
        </div>
        <div className="row">
          <span>التاريخ:</span>
          <span className="tabular">{formatDateTime(order.createdAt)}</span>
        </div>
        <div className="line" />
        {order.items.map((item) => (
          <div key={item.id} style={{ marginBottom: 4 }}>
            <div>{item.productNameAr}</div>
            <div className="row tabular">
              <span>
                {item.quantity} × {item.unitPrice.toFixed(2)}
              </span>
              <span>{item.total.toFixed(2)}</span>
            </div>
          </div>
        ))}
        <div className="line" />
        <div className="row tabular">
          <span>المجموع الفرعي</span>
          <span>{order.subtotal.toFixed(2)}</span>
        </div>
        {order.discountAmount > 0 ? (
          <div className="row tabular">
            <span>الخصم</span>
            <span>-{order.discountAmount.toFixed(2)}</span>
          </div>
        ) : null}
        <div className="row tabular">
          <span>الضريبة ({taxRate}%)</span>
          <span>{order.taxAmount.toFixed(2)}</span>
        </div>
        <div className="line" />
        <div className="row total tabular">
          <span>الإجمالي</span>
          <span>{order.total.toFixed(2)} {settings.currencySymbol}</span>
        </div>
        {payment ? (
          <div className="row tabular" style={{ marginTop: 4 }}>
            <span>طريقة الدفع</span>
            <span>{payment ? PAYMENT_LABELS[payment.method] : "—"}</span>
          </div>
        ) : null}
        <div className="line" />
        <div className="center" style={{ marginTop: 8, fontSize: 10 }}>
          شكراً لزيارتكم — Valentino
        </div>
      </div>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrint}>
        <Printer className="size-3.5" />
        طباعة
      </Button>
    </>
  );
}
