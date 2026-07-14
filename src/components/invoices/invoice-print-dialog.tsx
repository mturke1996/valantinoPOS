"use client";

import { useRef, useState } from "react";
import {
  Download,
  FileText,
  Printer,
  Receipt,
  Share2,
} from "lucide-react";
import { toast } from "sonner";

import type { DocPaperSize } from "@/components/documents/brand";
import { invoicePaymentStatusMeta } from "@/components/documents/brand";
import { InvoiceA5Template } from "@/components/documents/invoice-a5-template";
import { InvoiceThermalTemplate } from "@/components/documents/invoice-thermal-template";
import {
  buildQrDataUri,
  createInvoicePdf,
  downloadBlob,
  fetchLogoDataUri,
  toPdfPaperSize,
} from "@/components/documents/pdf";
import {
  openPrintWindow,
  paperPrintStyles,
  thermalPrintStyles,
} from "@/components/documents/print-window";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getState, printInvoice } from "@/lib/data/store";
import { buildInvoiceQrPayload } from "@/lib/services/invoice.service";
import {
  buildOrderWhatsAppMessage,
  resolveOrderWhatsAppPhone,
  shareOrderPdfOnWhatsApp,
} from "@/lib/whatsapp/order-share";
import { cn } from "@/lib/utils";
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
  const pageRef = useRef<HTMLDivElement>(null);
  const thermalRef = useRef<HTMLDivElement>(null);
  const [paperSize, setPaperSize] = useState<DocPaperSize>("a5");
  const [working, setWorking] = useState<"pdf" | "share" | null>(null);
  const state = getState();
  const settings = state.settings;
  const customer = order.customerId
    ? state.customers.find((item) => item.id === order.customerId) ?? null
    : null;
  const event =
    state.events.find((item) => item.orderId === order.id) ?? null;
  const payments = state.payments.filter(
    (payment) => payment.orderId === order.id,
  );
  const paymentMeta = invoicePaymentStatusMeta(order.paymentStatus);
  const sizeLabel = paperSize.toUpperCase();
  const fileName = `${invoice.invoiceNumber}-${sizeLabel}.pdf`;
  const qrPayload =
    invoice.qrPayload ??
    buildInvoiceQrPayload({ invoice, order, settings });

  const getPdf = async () => {
    const [logoUri, qrUri] = await Promise.all([
      fetchLogoDataUri(settings),
      buildQrDataUri(qrPayload),
    ]);
    return createInvoicePdf(
      {
        invoice,
        order,
        settings,
        customer,
        payments,
        event,
        paperSize: toPdfPaperSize(paperSize),
        logoUri,
        qrUri,
      },
      fileName,
    );
  };

  const handleDownloadPdf = async () => {
    setWorking("pdf");
    try {
      const { blob } = await getPdf();
      downloadBlob(blob, fileName);
      toast.success(`تم إنشاء PDF بحجم ${sizeLabel}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذر إنشاء ملف PDF",
      );
    } finally {
      setWorking(null);
    }
  };

  const handleShare = async () => {
    setWorking("share");
    try {
      const { file } = await getPdf();
      const message = buildOrderWhatsAppMessage({
        order,
        settings,
        customer,
        event,
        invoice,
      });
      const phone = resolveOrderWhatsAppPhone(
        order,
        customer,
        settings.whatsappCountryCode,
      );

      const result = await shareOrderPdfOnWhatsApp({
        file,
        message,
        phone,
        fileName,
        onDownloadFallback: downloadBlob,
      });

      if (result === "shared") {
        toast.success("تمت المشاركة — اختر واتساب من ورقة المشاركة");
      } else if (result === "whatsapp_text") {
        toast.success(
          "تم تنزيل PDF وفتح واتساب — أرفق الملف من التنزيلات في المحادثة",
        );
      } else {
        toast.message("تم تنزيل PDF", {
          description: "أضف رقم واتساب للعميل للإرسال المباشر",
        });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error(error instanceof Error ? error.message : "تعذرت المشاركة");
    } finally {
      setWorking(null);
    }
  };

  const handleThermalPrint = () => {
    const content = thermalRef.current;
    if (!content) return;
    const paperWidth = settings.thermalPaperWidth;
    const ok = openPrintWindow({
      title: invoice.invoiceNumber,
      bodyHtml: content.innerHTML,
      styles: thermalPrintStyles(paperWidth),
      width: paperWidth === 58 ? 300 : 420,
      height: 720,
      onAfterOpen: () => printInvoice(invoice.id),
    });
    if (ok) toast.success(`طباعة حرارية ${paperWidth} مم`);
  };

  const handlePaperPrint = () => {
    const content = pageRef.current;
    if (!content) return;
    const ok = openPrintWindow({
      title: `${sizeLabel} · ${invoice.invoiceNumber}`,
      bodyHtml: content.outerHTML,
      styles: paperPrintStyles(paperSize),
      includeAppStyles: true,
      width: paperSize === "a5" ? 620 : 820,
      height: paperSize === "a5" ? 880 : 1100,
      onAfterOpen: () => printInvoice(invoice.id),
    });
    if (ok) toast.success(`طباعة فاتورة ${sizeLabel}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(96dvh,100svh)] flex-col overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="border-b border-cacao-800/8">
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <FileText className="size-5 text-gold-400" />
            فاتورة {invoice.invoiceNumber}
            <Badge
              variant={
                order.paymentStatus === "paid" ? "secondary" : "outline"
              }
            >
              {paymentMeta.label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="bg-muted/25 py-4">
          <div className="mb-3 flex items-center justify-center gap-1">
            {(["a5", "a4"] as const).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setPaperSize(size)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
                  paperSize === size
                    ? "bg-cacao-800 text-white"
                    : "bg-white text-muted-foreground hover:bg-muted",
                )}
              >
                {size.toUpperCase()}
              </button>
            ))}
          </div>
          <div
            className={cn(
              "mx-auto overflow-auto rounded-lg border border-black/5 bg-white shadow-sm",
              paperSize === "a5" ? "max-w-[148mm]" : "max-w-[210mm]",
            )}
          >
            <InvoiceA5Template
              ref={pageRef}
              invoice={invoice}
              order={order}
              settings={settings}
              customer={customer}
              payments={payments}
              qrPayload={qrPayload}
              event={event}
              paperSize={paperSize}
            />
          </div>
          <div className="hidden">
            <InvoiceThermalTemplate
              ref={thermalRef}
              invoice={invoice}
              order={order}
              settings={settings}
              qrPayload={qrPayload}
              event={event}
            />
          </div>
        </DialogBody>

        <DialogFooter className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Button
            variant="outline"
            onClick={handleThermalPrint}
            className="gap-2"
          >
            <Receipt className="size-4" />
            حراري {settings.thermalPaperWidth} مم
          </Button>
          <Button variant="outline" onClick={handlePaperPrint} className="gap-2">
            <Printer className="size-4" />
            طباعة {sizeLabel}
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadPdf}
            disabled={working !== null}
            className="gap-2"
          >
            <Download className="size-4" />
            {working === "pdf" ? "جاري الإنشاء..." : `PDF ${sizeLabel}`}
          </Button>
          <Button
            onClick={handleShare}
            disabled={working !== null}
            className="gap-2 sm:flex-1"
          >
            <Share2 className="size-4" />
            {working === "share" ? "جاري التجهيز..." : "واتساب + PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
