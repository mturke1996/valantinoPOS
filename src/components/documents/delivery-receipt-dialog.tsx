"use client";

import { useRef, useState } from "react";
import { Download, Printer, Truck } from "lucide-react";
import { toast } from "sonner";

import { DeliveryReceiptTemplate } from "@/components/documents/delivery-receipt-template";
import {
  createDeliveryReceiptPdf,
  downloadBlob,
  fetchLogoDataUri,
} from "@/components/documents/pdf";
import {
  a4PrintStyles,
  openPrintWindow,
} from "@/components/documents/print-window";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getState } from "@/lib/data/store";
import type { Order } from "@/types";

interface DeliveryReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order;
}

export function DeliveryReceiptDialog({
  open,
  onOpenChange,
  order,
}: DeliveryReceiptDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [hidePrices, setHidePrices] = useState(false);
  const [working, setWorking] = useState(false);
  const state = getState();
  const settings = state.settings;
  const customer = order.customerId
    ? state.customers.find((item) => item.id === order.customerId) ?? null
    : null;
  const fileName = `تسليم-${order.orderNumber}.pdf`;

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    openPrintWindow({
      title: `تسليم ${order.orderNumber}`,
      bodyHtml: content.outerHTML,
      styles: a4PrintStyles(),
      includeAppStyles: true,
      width: 820,
      height: 1100,
    });
  };

  const handlePdf = async () => {
    setWorking(true);
    try {
      const logoUri = await fetchLogoDataUri(settings);
      const { blob } = await createDeliveryReceiptPdf(
        {
          order,
          settings,
          customer,
          hidePrices,
          logoUri,
        },
        fileName,
      );
      downloadBlob(blob, fileName);
      toast.success("تم تنزيل إيصال التسليم");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر إنشاء PDF");
    } finally {
      setWorking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(96dvh,100svh)] flex-col overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="border-b border-cacao-800/8">
          <DialogTitle className="flex items-center gap-2">
            <Truck className="size-5 text-gold-400" />
            واصل استلام · {order.orderNumber}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="bg-muted/25 py-4">
          <div className="mb-3 flex items-center justify-end gap-2 px-1">
            <Switch
              id="hide-prices"
              checked={hidePrices}
              onCheckedChange={setHidePrices}
            />
            <Label htmlFor="hide-prices" className="text-sm">
              نسخة للمندوب بدون أسعار
            </Label>
          </div>
          <div className="mx-auto max-w-[210mm] overflow-auto rounded-lg border border-black/5 bg-white shadow-sm">
            <DeliveryReceiptTemplate
              ref={printRef}
              order={order}
              settings={settings}
              customer={customer}
              hidePrices={hidePrices}
            />
          </div>
        </DialogBody>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <Printer className="size-4" />
            طباعة A4
          </Button>
          <Button onClick={handlePdf} disabled={working} className="gap-2">
            <Download className="size-4" />
            {working ? "جاري الإنشاء..." : "PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
