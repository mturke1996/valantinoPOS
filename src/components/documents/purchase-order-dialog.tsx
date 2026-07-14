"use client";

import { useRef, useState } from "react";
import { ClipboardList, Download, Printer } from "lucide-react";
import { toast } from "sonner";

import { PurchaseOrderTemplate } from "@/components/documents/purchase-order-template";
import { createDocumentPdf, downloadBlob } from "@/components/documents/pdf-export";
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
import { getState } from "@/lib/data/store";
import type { PurchaseOrder } from "@/types";

interface PurchaseOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder: PurchaseOrder;
}

export function PurchaseOrderDialog({
  open,
  onOpenChange,
  purchaseOrder,
}: PurchaseOrderDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [working, setWorking] = useState(false);
  const state = getState();
  const settings = state.settings;
  const supplier =
    state.suppliers.find((item) => item.id === purchaseOrder.supplierId) ??
    null;
  const fileName = `${purchaseOrder.poNumber}.pdf`;

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    openPrintWindow({
      title: purchaseOrder.poNumber,
      bodyHtml: content.outerHTML,
      styles: a4PrintStyles(),
      includeAppStyles: true,
      width: 820,
      height: 1100,
    });
  };

  const handlePdf = async () => {
    const content = printRef.current;
    if (!content) return;
    setWorking(true);
    try {
      const { blob } = await createDocumentPdf(content, fileName, "a4");
      downloadBlob(blob, fileName);
      toast.success("تم تنزيل أمر الشراء");
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
            <ClipboardList className="size-5 text-gold-400" />
            طلبية {purchaseOrder.poNumber}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="bg-muted/25 py-4">
          <div className="mx-auto max-w-[210mm] overflow-auto rounded-lg border border-black/5 bg-white shadow-sm">
            <PurchaseOrderTemplate
              ref={printRef}
              purchaseOrder={purchaseOrder}
              supplier={supplier}
              settings={settings}
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
