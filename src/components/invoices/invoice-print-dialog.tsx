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

import { invoicePaymentStatusMeta } from "@/components/documents/brand";
import { InvoiceA4Template } from "@/components/documents/invoice-a4-template";
import { InvoiceThermalTemplate } from "@/components/documents/invoice-thermal-template";
import {
  buildQrDataUri,
  createInvoicePdf,
  downloadBlob,
  fetchLogoDataUri,
} from "@/components/documents/pdf";
import {
  a4PrintStyles,
  openPrintWindow,
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
import { buildDocumentCodeValue } from "@/lib/services/invoice.service";
import {
  buildOrderWhatsAppMessage,
  isMobileUserAgent,
  openWhatsAppChat,
  resolveOrderWhatsAppPhone,
  shareOrderPdfOnWhatsApp,
} from "@/lib/whatsapp/order-share";
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
  const fileName = `${invoice.invoiceNumber}-A4.pdf`;
  const qrPayload = buildDocumentCodeValue({ invoice, order, settings });

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
        paperSize: "A4",
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
      toast.success("تم إنشاء PDF بحجم A4");
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
    const phone = resolveOrderWhatsAppPhone(
      order,
      customer,
      settings.whatsappCountryCode,
    );
    const message = buildOrderWhatsAppMessage({
      order,
      settings,
      customer,
      event,
      invoice,
    });

    if (!isMobileUserAgent()) {
      if (phone) {
        openWhatsAppChat(phone, message);
      } else {
        toast.message("لا يوجد رقم واتساب للعميل", {
          description: "سيتم تنزيل الفاتورة — أرسلها يدوياً",
        });
      }
      try {
        const { blob } = await getPdf();
        downloadBlob(blob, fileName);
        if (phone) {
          toast.success("تم فتح واتساب وتنزيل PDF — أرفق الملف من التنزيلات");
        } else {
          toast.message("تم تنزيل PDF");
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "تعذر إنشاء ملف PDF",
        );
      } finally {
        setWorking(null);
      }
      return;
    }

    const preOpened =
      phone && typeof window !== "undefined"
        ? window.open("about:blank", "_blank")
        : null;

    try {
      const { file } = await getPdf();
      const result = await shareOrderPdfOnWhatsApp({
        file,
        message,
        phone,
        fileName,
        onDownloadFallback: downloadBlob,
        preOpenedWindow: preOpened,
      });

      if (result === "shared") {
        toast.success("تمت المشاركة — اختر واتساب من ورقة المشاركة");
      } else if (result === "whatsapp_text") {
        toast.success(
          "تم تنزيل PDF وفتح واتساب — أرفق الملف من التنزيلات إن لزم",
        );
      } else {
        toast.message("تم تنزيل PDF", {
          description: "أضف رقم واتساب للعميل للإرسال المباشر",
        });
      }
    } catch (error) {
      if (phone) {
        openWhatsAppChat(phone, message, preOpened);
      } else {
        preOpened?.close();
      }
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
      title: `A4 · ${invoice.invoiceNumber}`,
      bodyHtml: content.outerHTML,
      styles: a4PrintStyles(),
      includeAppStyles: true,
      width: 860,
      height: 1140,
      onAfterOpen: () => printInvoice(invoice.id),
    });
    if (ok) toast.success("طباعة فاتورة A4");
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
            <Badge variant="outline" className="font-semibold">
              A4
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="bg-muted/25 py-4">
          <div className="mx-auto max-w-[210mm] overflow-auto rounded-lg border border-black/5 bg-white shadow-sm">
            <InvoiceA4Template
              ref={pageRef}
              invoice={invoice}
              order={order}
              settings={settings}
              customer={customer}
              payments={payments}
              qrPayload={qrPayload}
              event={event}
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
            طباعة A4
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadPdf}
            disabled={working !== null}
            className="gap-2"
          >
            <Download className="size-4" />
            {working === "pdf" ? "جاري الإنشاء..." : "PDF A4"}
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
