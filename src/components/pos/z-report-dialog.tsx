"use client";

import { useMemo, useRef, useState } from "react";
import { Download, FileDown, Printer } from "lucide-react";
import { toast } from "sonner";

import {
  downloadBlob,
  ZReportTemplate,
  type ZReportStats,
} from "@/components/documents";
import {
  createZReportPdf,
  fetchLogoDataUri,
} from "@/components/documents/pdf";
import {
  openPrintWindow,
  a5PrintStyles,
} from "@/components/documents/print-window";
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
import { formatDateTime } from "@/lib/utils";
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
  const printRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const report = useMemo((): ZReportStats | null => {
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
      cashSales,
      cardSales,
      transferSales,
      totalSales,
    };
  }, [shift]);

  if (!shift || !report) return null;

  const printReport = () => {
    const node = printRef.current;
    if (!node) return;
    openPrintWindow({
      title: `Z-Report ${shift.id}`,
      bodyHtml: node.innerHTML,
      styles: a5PrintStyles(),
      width: 520,
      height: 800,
      includeAppStyles: true,
    });
  };

  const downloadPdf = async () => {
    setBusy(true);
    try {
      const fileName = `z-report-${shift.id.slice(0, 8)}.pdf`;
      const logoUri = await fetchLogoDataUri(settings);
      const { blob } = await createZReportPdf(
        {
          shift,
          report,
          settings,
          cashierName,
          logoUri,
        },
        fileName,
      );
      downloadBlob(blob, fileName);
      toast.success("تم تنزيل تقرير Z");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذر إنشاء ملف PDF",
      );
    } finally {
      setBusy(false);
    }
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
              {shift.closingCount == null ? (
                <span className="tabular-nums">—</span>
              ) : (
                <CurrencyDisplay amount={shift.closingCount} />
              )}
            </div>
            <div className="flex justify-between font-semibold">
              <span>الفرق</span>
              {shift.variance == null ? (
                <span className="tabular-nums">—</span>
              ) : (
                <CurrencyDisplay
                  amount={shift.variance}
                  className={shift.variance < 0 ? "text-destructive" : ""}
                />
              )}
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

        {/* Off-screen branded template for print */}
        <div className="pointer-events-none fixed start-[-10000px] top-0 w-[148mm]">
          <div ref={printRef}>
            <ZReportTemplate
              shift={shift}
              report={report}
              cashierName={cashierName}
              settings={settings}
            />
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={printReport}>
            <Printer className="size-4" />
            طباعة
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => void downloadPdf()}>
            <FileDown className="size-4" />
            PDF
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
