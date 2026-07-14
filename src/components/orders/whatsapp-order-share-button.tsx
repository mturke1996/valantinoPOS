"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";

import {
  buildQrDataUri,
  createInvoicePdf,
  downloadBlob,
  fetchLogoDataUri,
} from "@/components/documents/pdf";
import { Button } from "@/components/ui/button";
import { ensureInvoiceForOrder, getState } from "@/lib/data/store";
import { buildInvoiceQrPayload } from "@/lib/services/invoice.service";
import {
  buildOrderWhatsAppMessage,
  isMobileUserAgent,
  openWhatsAppChat,
  resolveOrderWhatsAppPhone,
} from "@/lib/whatsapp/order-share";
import { cn } from "@/lib/utils";
import type { Order } from "@/types";

interface WhatsAppOrderShareButtonProps {
  order: Order;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "icon" | "lg";
  label?: string;
  onBeforeShare?: () => void;
}

/**
 * High-quality A4 vector PDF + detailed WhatsApp message (no system links).
 */
export function WhatsAppOrderShareButton({
  order,
  className,
  variant = "default",
  size = "default",
  label = "واتساب + PDF",
  onBeforeShare,
}: WhatsAppOrderShareButtonProps) {
  const [working, setWorking] = useState(false);

  const handleClick = async () => {
    setWorking(true);
    onBeforeShare?.();

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
    const fileName = `${ensured.invoiceNumber}.pdf`;
    const mobile = isMobileUserAgent();

    // Build the PDF (logo + QR + react-pdf) — protected by a timeout so a
    // hung react-pdf stream can never freeze the button forever.
    const buildPdf = async (): Promise<File> => {
      const qrPayload =
        ensured.qrPayload ??
        buildInvoiceQrPayload({ invoice: ensured, order, settings });
      const [logoUri, qrUri] = await Promise.all([
        fetchLogoDataUri(settings),
        buildQrDataUri(qrPayload),
      ]);
      const { file } = await createInvoicePdf(
        {
          invoice: ensured,
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
      return file;
    };

    // Desktop: open the WhatsApp chat IMMEDIATELY within the click gesture so it
    // never depends on async PDF generation (immune to popup blockers & hangs).
    // The PDF downloads in the background; the button is released at once.
    if (!mobile) {
      if (phone) {
        openWhatsAppChat(phone, message);
      } else {
        toast.message("لا يوجد رقم واتساب للعميل", {
          description: "سيتم تنزيل الفاتورة — أرسلها يدوياً",
        });
      }
      setWorking(false);
      buildPdf()
        .then((file) => downloadBlob(file, fileName))
        .catch((error) => {
          if (error instanceof DOMException && error.name === "AbortError")
            return;
          toast.error(
            error instanceof Error ? error.message : "تعذر إنشاء PDF",
          );
        });
      return;
    }

    // Mobile: prefer the native share sheet (attaches the PDF). Fall back to
    // wa.me + download if sharing is unavailable or the user cancels.
    try {
      const file = await buildPdf();
      const canShare =
        typeof navigator.canShare !== "function" ||
        navigator.canShare({ files: [file] });
      if (canShare) {
        try {
          await navigator.share({
            title: fileName.replace(/\.pdf$/i, ""),
            text: message,
            files: [file],
          });
          toast.success("تمت المشاركة — اختر واتساب من ورقة المشاركة");
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError")
            return;
          /* fall through to wa.me + download */
        }
      }
      if (phone) openWhatsAppChat(phone, message);
      downloadBlob(file, fileName);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (phone) openWhatsAppChat(phone, message);
      toast.error(
        error instanceof Error ? error.message : "تعذرت مشاركة واتساب",
      );
    } finally {
      setWorking(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={working}
      onClick={() => void handleClick()}
      className={cn("gap-2", className)}
    >
      <MessageCircle className="size-4" />
      {working ? "جاري التجهيز..." : label}
    </Button>
  );
}
