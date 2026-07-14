"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";

import { InvoiceA5Template } from "@/components/documents/invoice-a5-template";
import { createDocumentPdf, downloadBlob } from "@/components/documents/pdf-export";
import { Button } from "@/components/ui/button";
import { ensureInvoiceForOrder, getState } from "@/lib/data/store";
import {
  buildOrderWhatsAppMessage,
  resolveOrderWhatsAppPhone,
  shareOrderPdfOnWhatsApp,
} from "@/lib/whatsapp/order-share";
import { cn } from "@/lib/utils";
import type { Invoice, Order } from "@/types";

interface WhatsAppOrderShareButtonProps {
  order: Order;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "icon" | "lg";
  label?: string;
  onBeforeShare?: () => void;
}

function waitForPaint(ms = 160): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      window.setTimeout(resolve, ms);
    });
  });
}

/**
 * High-quality A4 PDF + detailed WhatsApp message (no system links).
 */
export function WhatsAppOrderShareButton({
  order,
  className,
  variant = "default",
  size = "default",
  label = "واتساب + PDF",
  onBeforeShare,
}: WhatsAppOrderShareButtonProps) {
  const pageRef = useRef<HTMLDivElement>(null);
  const [working, setWorking] = useState(false);
  const [captureInvoice, setCaptureInvoice] = useState<Invoice | null>(null);

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
      flushSync(() => {
        setCaptureInvoice(ensured);
      });
      await waitForPaint(140);

      const content = pageRef.current;
      if (!content) throw new Error("تعذر تجهيز ملف PDF");

      await waitForPaint(60);

      const fileName = `${ensured.invoiceNumber}.pdf`;
      const { file } = await createDocumentPdf(content, fileName, "a4");

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
        toast.success("تم إرسال الفاتورة ورسالة الطلب عبر واتساب");
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
      setCaptureInvoice(null);
    }
  };

  return (
    <>
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

      <div
        aria-hidden
        className="pointer-events-none fixed -left-[9999px] top-0 w-[210mm] opacity-0"
      >
        {captureInvoice ? (
          <InvoiceA5Template
            ref={pageRef}
            invoice={captureInvoice}
            order={order}
            settings={settings}
            customer={customer}
            payments={payments}
            qrPayload={captureInvoice.qrPayload}
            paperSize="a4"
          />
        ) : null}
      </div>
    </>
  );
}
