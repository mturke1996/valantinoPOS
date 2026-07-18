---
name: valentino-pdf-arabic
description: Build and improve Arabic RTL PDFs for Valentino POS with @react-pdf/renderer, Tajawal, PdfTable, and BiDi helpers. Use when editing invoice/delivery/purchase/Z-report PDFs, fixing Arabic table layout, or adding new printable documents.
---

# Valentino Arabic PDF

## Stack (do not change)

- `@react-pdf/renderer` + Tajawal (`PDF_FONT_FAMILY` / `ValentinoPdf`)
- Logical Unicode only — **never** Arabic Presentation Forms (U+FE70+)
- Hyphenation disabled in `pdfFonts.ts` (required for Arabic)

## Core modules

| File | Role |
|------|------|
| `src/components/documents/pdf/arabicPDF.ts` | `ar`, `arMixed`, `ltr`, `pdfDisplayValue`, dates/money |
| `src/components/documents/pdf/PdfTable.tsx` | RTL tables (rkeaz-group pattern) |
| `src/components/documents/pdf/pdfKit.tsx` | `PdfMoneyText`, `PdfArabicText`, `PdfLtrText`, chrome |
| `InvoicePDF` / `DeliveryReceiptPDF` / `PurchaseOrderPDF` / `ZReportPDF` | Documents |

## Tables (critical)

1. Define columns in **logical** RTL order: description → qty → … → money last.
2. `PdfTable` **visually reverses** columns so money lands on the physical left.
3. Use `kind`: `multiline` (product names), `num`, `money`, `date`, `check`, `text`.
4. Prefer `repeatHeader` for multi-page item lists.
5. Do **not** use CSS `direction: rtl` — react-pdf ignores it. Use `textAlign` + column reverse.

```tsx
<PdfTable
  columns={[
    { key: "desc", label: "الصنف", flex: 3, kind: "multiline", bold: true },
    { key: "qty", label: "الكمية", flex: 1, kind: "num" },
    { key: "total", label: "الإجمالي", flex: 1.4, kind: "money" },
  ]}
  currency={settings.currencySymbol}
  repeatHeader
  rows={items.map((i) => ({
    desc: i.productNameAr,
    qty: i.quantity,
    total: i.total,
  }))}
/>
```

## Text rules

- Pure Arabic labels → `ar("…")` or `<PdfArabicText>`
- Mixed Arabic + SKU/digits → `arMixed` / `pdfDisplayValue`
- Phones, order numbers, SKUs → `ltr` / `<PdfLtrText>`
- Money → always `<PdfMoneyText amount currency>` (never a single flipped string)

## Layout

- Page chrome: `PdfDocHeader` / `PdfDocFooter` / `makePdfStyles()` (premium A4)
- Pagination reserves: `PDF_PAGINATION` (aligned with Etlala / rkeaz-group)
- Formal paper is **A4 only** (`Page size="A4"`); thermal remains separate

## Do / Don't

**Do**
- Keep `language="ar"` on `<Document>`
- Reuse `PdfTable` for every new item grid
- Isolate LTR runs with `ltr` / `arMixed`

**Don't**
- Reverse Arabic strings manually
- Put mixed phone/name in one unisolated `Text`
- Invent a second table layout beside `PdfTable`

## Reference

Proven sibling project: `rkeaz-group/src/features/pdf/` (`PdfTable.tsx`, `arabicPDF.ts`).
