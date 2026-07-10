"use client";

import { useMemo } from "react";
import { Download, Printer } from "lucide-react";

import { CurrencyDisplay } from "@/components/shared/currency-display";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { getOrders, getState, getSettings } from "@/lib/data/store";
import { formatDateTime, formatNumber } from "@/lib/utils";
import type { Shift } from "@/types";

interface ZReportDialogProps {
  shift: Shift | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cashierName?: string;
}

export function ZReportDialog({
  shift,
  open,
  onOpenChange,
  cashierName,
}: ZReportDialogProps) {
  const settings = getSettings();

  const report = useMemo(() => {
    if (!shift) return null;
    const orders = getOrders().filter((o) => o.shiftId === shift.id);
    const payments = getState().payments.filter(
      (p) => p.shiftId === shift.id || orders.some((o) => o.id === p.orderId),
    );
    const cashSales = payments
      .filter((p) => p.method === "cash" || p.method === "mixed")
      .reduce((sum, p) => sum + (p.cashAmount ?? p.amount), 0);
    const cardSales = payments
      .filter((p) => p.method === "card" || p.method === "mixed")
      .reduce((sum, p) => sum + (p.cardAmount ?? p.amount), 0);
    const transferSales = payments
      .filter((p) => p.method === "transfer")
      .reduce((sum, p) => sum + p.amount, 0);
    const totalSales = payments.reduce((sum, p) => sum + p.amount, 0);

    return {
      orders: orders.length,
      payments: payments.length,
      cashSales,
      cardSales,
      transferSales,
      totalSales,
    };
  }, [shift]);

  if (!shift || !report) return null;

  const printReport = () => {
    const html = `
      <html dir="rtl"><head><title>Z-Report ${shift.id}</title>
      <style>body{font-family:system-ui;padding:24px} table{width:100%;border-collapse:collapse} td{padding:6px 0;border-bottom:1px solid #eee}</style>
      </head><body>
      <h1>تقرير إغلاق الوردية (Z-Report)</h1>
      <p>${settings.branchName}</p>
      <table>
        <tr><td>الكاشير</td><td>${cashierName ?? "—"}</td></tr>
        <tr><td>فتح</td><td>${formatDateTime(shift.openedAt)}</td></tr>
        <tr><td>إغلاق</td><td>${shift.closedAt ? formatDateTime(shift.closedAt) : "—"}</td></tr>
        <tr><td>رصيد افتتاحي</td><td>${formatNumber(shift.openingFloat)} ${settings.currencySymbol}</td></tr>
        <tr><td>المتوقع نقداً</td><td>${formatNumber(shift.expectedCash)} ${settings.currencySymbol}</td></tr>
        <tr><td>العد الفعلي</td><td>${shift.closingCount != null ? formatNumber(shift.closingCount) : "—"} ${settings.currencySymbol}</td></tr>
        <tr><td>الفرق</td><td>${shift.variance != null ? formatNumber(shift.variance) : "—"} ${settings.currencySymbol}</td></tr>
        <tr><td>عدد الطلبات</td><td>${report.orders}</td></tr>
        <tr><td>مبيعات نقدية</td><td>${formatNumber(report.cashSales)} ${settings.currencySymbol}</td></tr>
        <tr><td>مبيعات بطاقة</td><td>${formatNumber(report.cardSales)} ${settings.currencySymbol}</td></tr>
        <tr><td>مبيعات تحويل</td><td>${formatNumber(report.transferSales)} ${settings.currencySymbol}</td></tr>
        <tr><td>إجمالي التحصيل</td><td>${formatNumber(report.totalSales)} ${settings.currencySymbol}</td></tr>
      </table>
      </body></html>`;
    const win = window.open("", "_blank", "width=480,height=720");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>تقرير Z — إغلاق الوردية</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2 text-muted-foreground">
            <span>الكاشير</span>
            <span className="text-start font-medium text-foreground">
              {cashierName ?? "—"}
            </span>
            <span>فتح الوردية</span>
            <span className="text-start">{formatDateTime(shift.openedAt)}</span>
            <span>إغلاق الوردية</span>
            <span className="text-start">
              {shift.closedAt ? formatDateTime(shift.closedAt) : "—"}
            </span>
          </div>
          <Separator />
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>رصيد افتتاحي</span>
              <CurrencyDisplay amount={shift.openingFloat} />
            </div>
            <div className="flex justify-between">
              <span>المتوقع في الدرج</span>
              <CurrencyDisplay amount={shift.expectedCash} />
            </div>
            <div className="flex justify-between">
              <span>العد الفعلي</span>
              <CurrencyDisplay amount={shift.closingCount ?? 0} />
            </div>
            <div className="flex justify-between font-semibold">
              <span>الفرق</span>
              <CurrencyDisplay
                amount={shift.variance ?? 0}
                className={
                  (shift.variance ?? 0) < 0 ? "text-destructive" : ""
                }
              />
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>طلبات الوردية</span>
              <span className="font-mono">{report.orders}</span>
            </div>
            <div className="flex justify-between">
              <span>نقدي</span>
              <CurrencyDisplay amount={report.cashSales} />
            </div>
            <div className="flex justify-between">
              <span>بطاقة</span>
              <CurrencyDisplay amount={report.cardSales} />
            </div>
            <div className="flex justify-between">
              <span>تحويل</span>
              <CurrencyDisplay amount={report.transferSales} />
            </div>
            <div className="flex justify-between font-semibold">
              <span>إجمالي التحصيل</span>
              <CurrencyDisplay amount={report.totalSales} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={printReport}>
            <Printer className="size-4" />
            طباعة
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            <Download className="size-4" />
            تم
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
