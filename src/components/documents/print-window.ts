import { toast } from "sonner";

import { DOC_FONT_STACK } from "@/components/documents/brand";

export type PaperFormat = "thermal" | "a4";

function docFontFaceCss(origin = ""): string {
  const base = origin.replace(/\/$/, "");
  const regular = `${base}/fonts/Tajawal-Regular.ttf`;
  const bold = `${base}/fonts/Tajawal-Bold.ttf`;
  return `
@font-face {
  font-family: "Tajawal";
  src: url("${regular}") format("truetype");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Tajawal";
  src: url("${bold}") format("truetype");
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
`;
}

function collectPageStyles(): string {
  const chunks: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = sheet.cssRules;
      if (!rules) continue;
      for (const rule of Array.from(rules)) {
        chunks.push(rule.cssText);
      }
    } catch {
      if (sheet.href) {
        chunks.push(`@import url("${sheet.href}");`);
      }
    }
  }
  return chunks.join("\n");
}

export function openPrintWindow(options: {
  title: string;
  bodyHtml: string;
  styles: string;
  width?: number;
  height?: number;
  /** Pull live Tailwind / app CSS into the print window (needed for HTML invoice preview). */
  includeAppStyles?: boolean;
  onAfterOpen?: () => void;
}): boolean {
  const win = window.open(
    "",
    "_blank",
    `width=${options.width ?? 480},height=${options.height ?? 800}`,
  );
  if (!win) {
    toast.error("اسمح بفتح نافذة الطباعة من المتصفح");
    return false;
  }

  const appStyles = options.includeAppStyles ? collectPageStyles() : "";
  const origin = window.location.origin;

  win.document.write(`<!doctype html>
<html dir="rtl" lang="ar">
  <head>
    <meta charset="utf-8" />
    <base href="${origin}/" />
    <title>${options.title}</title>
    <style>${docFontFaceCss(origin)}\n${appStyles}\n${options.styles}</style>
  </head>
  <body>${options.bodyHtml}</body>
</html>`);
  win.document.close();
  options.onAfterOpen?.();

  win.addEventListener("load", () => {
    window.setTimeout(() => {
      win.focus();
      win.print();
      win.close();
    }, 420);
  });

  return true;
}

export function thermalPrintStyles(paperWidth: 58 | 80): string {
  const fontSize = paperWidth === 58 ? "9px" : "11px";
  return `
    @page { size: ${paperWidth}mm auto; margin: 2mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: ${paperWidth - 4}mm;
      margin: 0 auto;
      padding: 1mm;
      color: #111;
      background: #fff;
      font-family: ${DOC_FONT_STACK};
      font-size: ${fontSize};
      line-height: 1.45;
    }
    .center { text-align: center; }
    .bold { font-weight: 700; }
    .line { border-top: 1px dashed #444; margin: 5px 0; }
    .row { display: flex; justify-content: space-between; gap: 6px; margin: 2px 0; direction: rtl; }
    .total { font-size: 1.25em; font-weight: 800; }
    .tabular { font-variant-numeric: tabular-nums; }
    .money-ar { font-variant-numeric: tabular-nums; white-space: nowrap; }
    .num-ltr { direction: ltr; unicode-bidi: isolate; display: inline-block; }
    .muted { color: #555; }
    .logo { display: block; width: 78%; max-height: 22mm; object-fit: contain; margin: 0 auto 2mm; }
    svg { display: block; width: 22mm; height: 22mm; margin: 2mm auto; }
    .item-name { font-weight: 600; margin-bottom: 1px; }
    .chip {
      display: inline-block;
      border: 1px solid #222;
      padding: 1px 5px;
      font-size: 0.85em;
      font-weight: 700;
      margin-bottom: 4px;
    }
  `;
}

/** True ISO A4 portrait — vector-sharp colors for print */
export function a4PrintStyles(): string {
  return `
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #1F1F1F;
      font-family: ${DOC_FONT_STACK};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      color-adjust: exact;
    }
    .doc-shell {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #fff;
      font-family: ${DOC_FONT_STACK};
    }
    .money-ar { font-variant-numeric: tabular-nums; white-space: nowrap; }
    .num-ltr { direction: ltr; unicode-bidi: isolate; display: inline-block; }
    @media print {
      html, body { width: 210mm; height: 297mm; }
      .doc-shell {
        width: 210mm;
        min-height: 297mm;
        box-shadow: none !important;
        border: 0 !important;
      }
    }
  `;
}

/** @deprecated use a4PrintStyles — formal paper is A4 only */
export function paperPrintStyles(_size: "a4" = "a4"): string {
  return a4PrintStyles();
}
