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
  resolveOrderWhatsAppPhone,
  shareOrderPdfOnWhatsApp,
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

  const handleClick = async () => {
    setWorking(true);
    onBeforeShare?.();
    try {
      const ensured = ensureInvoiceForOrder(order.id);
      const qrPayload =
        ensured.qrPayload ??
        buildInvoiceQrPayload({ invoice: ensured, order, settings });
      const [logoUri, qrUri] = await Promise.all([
        fetchLogoDataUri(settings),
        buildQrDataUri(qrPayload),
      ]);

      const fileName = `${ensured.invoiceNumber}.pdf`;
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

      const message = buildOrderWhatsAppMessage({
        order,
        settings,
        customer,
        event,
        invoice: ensured,
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
          description: "أضف رقم واتساب للعميل لإرسال الرسالة مباشرة",
        });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
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
      onClick={handleClick}
      className={cn("gap-2", className)}
    >
      <MessageCircle className="size-4" />
      {working ? "جاري التجهيز..." : label}
    </Button>
  );
}
