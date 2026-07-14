import { createElement, type ReactElement } from "react";

import { ensurePdfFontsLoaded } from "@/components/documents/pdf/pdfFonts";
import type { PdfPaperSize } from "@/components/documents/pdf/pdfKit";
import type { DeliveryReceiptPdfProps } from "@/components/documents/pdf/DeliveryReceiptPDF";
import type { InvoicePdfProps } from "@/components/documents/pdf/InvoicePDF";
import type { PurchaseOrderPdfProps } from "@/components/documents/pdf/PurchaseOrderPDF";
import type { ZReportPdfProps } from "@/components/documents/pdf/ZReportPDF";

export type { PdfPaperSize };

async function ensureBufferPolyfill(): Promise<void> {
  if (typeof window === "undefined") return;
  const g = globalThis as typeof globalThis & { Buffer?: unknown };
  if (g.Buffer) return;
  const { Buffer } = await import("buffer");
  g.Buffer = Buffer;
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2_000);
}

/**
 * Vector PDF via @react-pdf/renderer + embedded Tajawal (rkeaz pattern).
 * Sharp Arabic text — not html2canvas raster.
 */
export async function generatePdfBlob(
  component: ReactElement,
): Promise<Blob> {
  await ensureBufferPolyfill();
  await ensurePdfFontsLoaded();
  const { pdf } = await import("@react-pdf/renderer");
  const asPdf = pdf();
  asPdf.updateContainer(component);
  return asPdf.toBlob();
}

export async function createReactPdf(
  component: ReactElement,
  fileName: string,
): Promise<{ blob: Blob; file: File }> {
  const blob = await generatePdfBlob(component);
  return {
    blob,
    file: new File([blob], fileName, { type: "application/pdf" }),
  };
}

/** Map UI paper size to react-pdf page size */
export function toPdfPaperSize(size: "a4" | "a5"): PdfPaperSize {
  return size === "a5" ? "A5" : "A4";
}

/** Dynamic PDF component factories — keep @react-pdf out of dialog initial chunks. */

export async function createInvoicePdf(
  props: InvoicePdfProps,
  fileName: string,
): Promise<{ blob: Blob; file: File }> {
  const { InvoicePDF } = await import("@/components/documents/pdf/InvoicePDF");
  return createReactPdf(createElement(InvoicePDF, props), fileName);
}

export async function createZReportPdf(
  props: ZReportPdfProps,
  fileName: string,
): Promise<{ blob: Blob; file: File }> {
  const { ZReportPDF } = await import("@/components/documents/pdf/ZReportPDF");
  return createReactPdf(createElement(ZReportPDF, props), fileName);
}

export async function createDeliveryReceiptPdf(
  props: DeliveryReceiptPdfProps,
  fileName: string,
): Promise<{ blob: Blob; file: File }> {
  const { DeliveryReceiptPDF } = await import(
    "@/components/documents/pdf/DeliveryReceiptPDF"
  );
  return createReactPdf(createElement(DeliveryReceiptPDF, props), fileName);
}

export async function createPurchaseOrderPdf(
  props: PurchaseOrderPdfProps,
  fileName: string,
): Promise<{ blob: Blob; file: File }> {
  const { PurchaseOrderPDF } = await import(
    "@/components/documents/pdf/PurchaseOrderPDF"
  );
  return createReactPdf(createElement(PurchaseOrderPDF, props), fileName);
}
