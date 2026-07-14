/**
 * Document PDF export — vector @react-pdf (Tajawal embedded).
 * Kept as thin re-export so existing imports keep working.
 */
export {
  createReactPdf,
  downloadBlob,
  generatePdfBlob,
  toPdfPaperSize,
} from "@/components/documents/pdf/pdfService";

/**
 * @deprecated Removed — old html2canvas API.
 * Use createReactPdf / createInvoicePdf / createZReportPdf / etc.
 */
export function createDocumentPdf(..._args: unknown[]): never {
  throw new Error(
    "createDocumentPdf(HTMLElement, fileName, paperSize) was removed. Use createReactPdf(<InvoicePDF … />, fileName) or createInvoicePdf / createZReportPdf / createDeliveryReceiptPdf / createPurchaseOrderPdf.",
  );
}
