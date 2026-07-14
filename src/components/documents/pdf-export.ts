import { DOC_FONT_STACK } from "@/components/documents/brand";

export type PdfPaperSize = "a5" | "a4";

const PAPER_MM: Record<PdfPaperSize, { w: number; h: number }> = {
  a5: { w: 148, h: 210 },
  a4: { w: 210, h: 297 },
};

function docFontFaceCss(origin: string): string {
  const base = origin.replace(/\/$/, "");
  return `
@font-face {
  font-family: "Tajawal";
  src: url("${base}/fonts/Tajawal-Regular.ttf") format("truetype");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Tajawal";
  src: url("${base}/fonts/Tajawal-Bold.ttf") format("truetype");
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
`;
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

async function ensureDocFontsReady(): Promise<void> {
  if (typeof document === "undefined") return;
  const origin = window.location.origin;
  const css = docFontFaceCss(origin);

  if (!document.getElementById("valentino-doc-fonts")) {
    const style = document.createElement("style");
    style.id = "valentino-doc-fonts";
    style.textContent = css;
    document.head.appendChild(style);
  }

  try {
    await Promise.all([
      document.fonts.load('400 16px "Tajawal"'),
      document.fonts.load('700 16px "Tajawal"'),
    ]);
  } catch {
    /* Cairo from next/font may still render Arabic */
  }
  await document.fonts?.ready;
}

export async function createDocumentPdf(
  element: HTMLElement,
  fileName: string,
  format: PdfPaperSize = "a4",
): Promise<{ blob: Blob; file: File }> {
  await ensureDocFontsReady();

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const paper = PAPER_MM[format];
  const scale = Math.min(3, Math.max(2.5, window.devicePixelRatio || 2));
  const origin = window.location.origin;
  const fontCss = docFontFaceCss(origin);

  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: false,
    backgroundColor: "#ffffff",
    logging: false,
    imageTimeout: 15_000,
    windowWidth: Math.max(element.scrollWidth, format === "a4" ? 900 : 560),
    onclone: (clonedDoc, clonedElement) => {
      if (!clonedDoc.getElementById("valentino-doc-fonts")) {
        const style = clonedDoc.createElement("style");
        style.id = "valentino-doc-fonts";
        style.textContent = fontCss;
        clonedDoc.head.appendChild(style);
      }
      // Preserve Arabic RTL — do NOT force LTR on the whole document
      clonedDoc.documentElement.setAttribute("dir", "rtl");
      clonedDoc.documentElement.setAttribute("lang", "ar");
      clonedDoc.body.style.fontFamily = DOC_FONT_STACK;
      clonedDoc.body.style.direction = "rtl";
      clonedElement.style.fontFamily = DOC_FONT_STACK;
      clonedElement.style.direction = "rtl";
      clonedElement.querySelectorAll("*").forEach((node) => {
        const el = node as HTMLElement;
        if (!el.style) return;
        // Keep Tajawal; leave existing direction alone (phones may use num-ltr)
        if (!el.classList.contains("num-ltr") && el.getAttribute("dir") !== "ltr") {
          el.style.fontFamily = DOC_FONT_STACK;
        } else {
          el.style.fontFamily = DOC_FONT_STACK;
        }
      });
    },
  });

  const image = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format,
    compress: true,
  });

  const margin = 0;
  const printableWidth = paper.w - margin * 2;
  const printableHeight = paper.h - margin * 2;
  const imageHeight = (canvas.height * printableWidth) / canvas.width;
  let heightLeft = imageHeight;
  let position = margin;

  pdf.addImage(
    image,
    "PNG",
    margin,
    position,
    printableWidth,
    imageHeight,
    undefined,
    "FAST",
  );
  heightLeft -= printableHeight;

  while (heightLeft > 0.5) {
    pdf.addPage();
    position = margin - (imageHeight - heightLeft);
    pdf.addImage(
      image,
      "PNG",
      margin,
      position,
      printableWidth,
      imageHeight,
      undefined,
      "FAST",
    );
    heightLeft -= printableHeight;
  }

  const blob = pdf.output("blob");
  return {
    blob,
    file: new File([blob], fileName, { type: "application/pdf" }),
  };
}
