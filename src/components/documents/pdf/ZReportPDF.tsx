import { Document, Page, Text, View } from "@react-pdf/renderer";

import {
  ar,
  arDateTime,
  pdfDisplayValue,
} from "@/components/documents/pdf/arabicPDF";
import {
  INK,
  PdfDocFooter,
  PdfDocHeader,
  PdfMoneyText,
  makePdfStyles,
} from "@/components/documents/pdf/pdfKit";
import type { ZReportStats } from "@/components/documents/z-report-template";
import type { Settings, Shift } from "@/types";

export interface ZReportPdfProps {
  shift: Shift;
  report: ZReportStats;
  settings: Settings;
  cashierName?: string;
  logoUri?: string | null;
}

export function ZReportPDF({
  shift,
  report,
  settings,
  cashierName,
  logoUri,
}: ZReportPdfProps) {
  const s = makePdfStyles(true);
  const currency = settings.currencySymbol;
  const closed = shift.status === "closed";

  const rows: Array<{
    label: string;
    value?: string;
    amount?: number;
    emphasize?: boolean;
  }> = [
    { label: "الكاشير", value: cashierName ?? "—" },
    { label: "فتح الوردية", value: arDateTime(shift.openedAt) },
    {
      label: "إغلاق الوردية",
      value: shift.closedAt ? arDateTime(shift.closedAt) : "مفتوحة",
    },
    { label: "رصيد افتتاحي", amount: shift.openingFloat },
    { label: "المتوقع نقداً", amount: shift.expectedCash },
    {
      label: "العد الفعلي",
      amount: shift.closingCount ?? undefined,
      value: shift.closingCount == null ? "—" : undefined,
    },
    {
      label: "الفرق",
      amount: shift.variance ?? undefined,
      value: shift.variance == null ? "—" : undefined,
      emphasize: true,
    },
    { label: "عدد الطلبات", value: String(report.orders) },
    { label: "مبيعات نقدية", amount: report.cashSales },
    { label: "مبيعات بطاقة", amount: report.cardSales },
    { label: "مبيعات تحويل", amount: report.transferSales },
    {
      label: "إجمالي التحصيل",
      amount: report.totalSales,
      emphasize: true,
    },
  ];

  return (
    <Document
      title={`تقرير Z ${shift.id.slice(0, 8)}`}
      author={settings.branchName}
      language="ar"
    >
      <Page size="A5" style={s.page}>
        <PdfDocFooter s={s} note="تقرير إغلاق وردية — للاستخدام الداخلي" />
        <PdfDocHeader
          s={s}
          settings={settings}
          titleEn="Z-REPORT"
          titleAr="تقرير الإغلاق"
          refLine={shift.id.slice(0, 8).toUpperCase()}
          statusLabel={closed ? "مغلقة" : "مفتوحة"}
          statusColor={closed ? INK.success : INK.warning}
          logoUri={logoUri}
        />

        <Text style={s.sectionTitle}>{ar("ملخص الوردية")}</Text>

        {rows.map((row, i) => (
          <View
            key={row.label}
            style={[
              {
                flexDirection: "row-reverse",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 7,
                paddingHorizontal: 10,
                borderBottomWidth: 1,
                borderBottomColor: INK.border,
              },
              i % 2 === 1 ? s.rowEven : {},
              row.emphasize
                ? {
                    backgroundColor: INK.paleGold,
                    borderBottomWidth: 0,
                    marginTop: 4,
                    borderRadius: 2,
                  }
                : {},
            ]}
            wrap={false}
          >
            <Text
              style={[
                s.tdBold,
                { textAlign: "right" },
                row.emphasize ? { color: INK.goldDeep } : {},
              ]}
            >
              {ar(row.label)}
            </Text>
            {row.amount != null ? (
              <PdfMoneyText
                amount={row.amount}
                currency={currency}
                style={row.emphasize ? { color: INK.goldDeep } : undefined}
              />
            ) : (
              <Text style={[s.td, { textAlign: "left" }]}>
                {pdfDisplayValue(row.value ?? "—")}
              </Text>
            )}
          </View>
        ))}
      </Page>
    </Document>
  );
}
