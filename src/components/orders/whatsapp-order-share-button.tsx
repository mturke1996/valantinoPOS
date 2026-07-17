"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";

import {
  buildQrDataUri,
  createInvoicePdf,
  downloadBlob,
  fetchLogoDataUri,
  type PdfPaperSize,
} from "@/components/documents/pdf";
import { Button } from "@/components/ui/button";
import { ensureInvoiceForOrder, getState } from "@/lib/data/store";
import { buildDocumentCodeValue } from "@/lib/services/invoice.service";
import {
  buildOrderWhatsAppMessage,
  isMobileUserAgent,
  openWhatsAppChat,
  resolveOrderWhatsAppPhone,
  shareOrderPdfOnWhatsApp,
} from "@/lib/whatsapp/order-share";
import { cn } from "@/lib/utils";
import type { Customer, Event, Order, Payment, Settings } from "@/types";

interface WhatsAppOrderShareButtonProps {
  order: Order;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "icon" | "lg";
  label?: string;
  onBeforeShare?: () => void;
  /** PDF page size for the attached invoice (defaults to A4). */
  paperSize?: PdfPaperSize;
  /** Override the downloaded file name (defaults to "<invoiceNumber>.pdf"). */
  fileName?: string;
}

interface ShareContext {
  settings: Settings;
  customer: Customer | null;
  event: Event | null;
  payments: Payment[];
  phone: string | null;
  message: string;
  invoiceNumber: string;
  fileName: string;
}

/**
 * Shares the order's invoice as a real PDF file on WhatsApp.
 *
 * - Mobile (Web Share with files): builds the PDF, then opens the native share
 *   sheet so the user picks WhatsApp and the PDF is attached.
 * - Desktop (no file share): opens wa.me with the order text inside the click
 *   gesture (popup-safe) and downloads the PDF in the background — wa.me
 *   cannot attach files, so download + open chat is the best desktop can do.
 *
 * PDF generation is bounded by a 20s timeout (see createInvoicePdf) so a hung
 * react-pdf stream never freezes the button. The button always releases and
 * leaves the user with a usable result (shared file, downloaded file, or an
 * open WhatsApp chat).
 */
export function WhatsAppOrderShareButton({
  order,
  className,
  variant = "default",
  size = "default",
  label = "واتساب + PDF",
  onBeforeShare,
  paperSize = "A4",
  fileName,
}: WhatsAppOrderShareButtonProps) {
  const [working, setWorking] = useState(false);

  const gatherContext = (): ShareContext => {
    const state = getState();
    const settings = state.settings;
    const customer = order.customerId
      ? (state.customers.find((item) => item.id === order.customerId) ?? null)
      : null;
    const event =
      state.events.find((item) => item.orderId === order.id) ?? null;
    const payments = state.payments.filter(
      (payment) => payment.orderId === order.id,
    );
    const phone = resolveOrderWhatsAppPhone(
      order,
      customer,
      settings.whatsappCountryCode,
    );
    const ensured = ensureInvoiceForOrder(order.id);
    const message = buildOrderWhatsAppMessage({
      order,
      settings,
      customer,
      event,
      invoice: ensured,
    });
    const resolvedFileName = fileName ?? `${ensured.invoiceNumber}.pdf`;
    return {
      settings,
      customer,
      event,
      payments,
      phone,
      message,
      invoiceNumber: ensured.invoiceNumber,
      fileName: resolvedFileName,
    };
  };

  // Build the invoice PDF (logo + QR + react-pdf). createInvoicePdf wraps the
  // render in a 20s timeout, so a hung stream rejects instead of freezing.
  const buildFile = async (ctx: ShareContext): Promise<File> => {
    const ensured = ensureInvoiceForOrder(order.id);
    const qrPayload = buildDocumentCodeValue({
      invoice: ensured,
      order,
      settings: ctx.settings,
    });
    const [logoUri, qrUri] = await Promise.all([
      fetchLogoDataUri(ctx.settings),
      buildQrDataUri(qrPayload),
    ]);
    const { file } = await createInvoicePdf(
      {
        invoice: ensured,
        order,
        settings: ctx.settings,
        customer: ctx.customer,
        payments: ctx.payments,
        event: ctx.event,
        paperSize,
        logoUri,
        qrUri,
      },
      ctx.fileName,
    );
    return file;
  };

  const isAbort = (error: unknown) =>
    error instanceof DOMException && error.name === "AbortError";

  const handleClick = async () => {
    setWorking(true);
    onBeforeShare?.();

    let ctx: ShareContext;
    try {
      ctx = gatherContext();
    } catch (error) {
      setWorking(false);
      toast.error(
        error instanceof Error ? error.message : "تعذرت تجهيز رسالة واتساب",
      );
      return;
    }

    // Desktop: open the WhatsApp chat IMMEDIATELY within the click gesture so it
    // never depends on async PDF generation (immune to popup blockers & hangs).
    // The PDF is then built + downloaded in the background; the button releases
    // at once and the user always gets a chat + a downloaded file.
    if (!isMobileUserAgent()) {
      if (ctx.phone) {
        openWhatsAppChat(ctx.phone, ctx.message);
      } else {
        toast.message("لا يوجد رقم واتساب للعميل", {
          description: "سيتم تنزيل الفاتورة — أرسلها يدوياً",
        });
      }
      setWorking(false);
      buildFile(ctx)
        .then((file) => downloadBlob(file, ctx.fileName))
        .catch((error) => {
          if (isAbort(error)) return;
          toast.error(
            error instanceof Error ? error.message : "تعذر إنشاء PDF",
          );
        });
      return;
    }

    // Mobile: bounded build, then the native share sheet attaches the PDF.
    // Falls back to wa.me + download if sharing is unavailable or cancelled.
    try {
      const file = await buildFile(ctx);
      const result = await shareOrderPdfOnWhatsApp({
        file,
        message: ctx.message,
        phone: ctx.phone,
        fileName: ctx.fileName,
        onDownloadFallback: downloadBlob,
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
      if (isAbort(error)) return;
      // No file (e.g. render timeout) — still give the user a usable chat.
      if (ctx.phone) openWhatsAppChat(ctx.phone, ctx.message);
      toast.error(
        error instanceof Error ? error.message : "تعذرت مشاركة واتساب",
      );
    } finally {
      setWorking(false);
    }
  };

  const showLabel = Boolean(label);
  const busyLabel = working ? "جاري التجهيز..." : label;

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={working}
      onClick={() => void handleClick()}
      aria-label={showLabel ? undefined : working ? "جاري التجهيز..." : "واتساب"}
      title={showLabel ? undefined : "واتساب + PDF"}
      className={cn(showLabel && "gap-2", className)}
    >
      <MessageCircle className="size-4 shrink-0" />
      {showLabel ? busyLabel : null}
    </Button>
  );
}
