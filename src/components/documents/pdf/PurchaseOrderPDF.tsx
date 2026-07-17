import { Document, Page, Text, View } from "@react-pdf/renderer";

import { PO_STATUS_LABELS } from "@/components/documents/brand";
import {
  ar,
  arDate,
  arDateTime,
  arMixed,
} from "@/components/documents/pdf/arabicPDF";
import {
  PdfTable,
  type PdfColumn,
} from "@/components/documents/pdf/PdfTable";
import {
  INK,
  PdfContinuationBanner,
  PdfDocFooter,
  PdfDocHeader,
  PdfLtrText,
  PdfMoneyText,
  PdfNotesBox,
  PdfSignatureRow,
  makePdfStyles,
} from "@/components/documents/pdf/pdfKit";
import type { PurchaseOrder, Settings, Supplier } from "@/types";

const PO_COLUMNS: PdfColumn[] = [
  { key: "desc", label: "الصنف", flex: 3, kind: "multiline", bold: true },
  { key: "qty", label: "الكمية", flex: 0.9, kind: "num" },
  { key: "recv", label: "المستلم", flex: 0.9, kind: "num" },
  { key: "cost", label: "التكلفة", flex: 1.2, kind: "money" },
  { key: "total", label: "الإجمالي", flex: 1.3, kind: "money" },
];

export interface PurchaseOrderPdfProps {
  purchaseOrder: PurchaseOrder;
  supplier: Supplier | null;
  settings: Settings;
  logoUri?: string | null;
}

export function PurchaseOrderPDF({
  purchaseOrder,
  supplier,
  settings,
  logoUri,
}: PurchaseOrderPdfProps) {
  const s = makePdfStyles(false);
  const currency = settings.currencySymbol;
  const statusLabel =
    PO_STATUS_LABELS[purchaseOrder.status] ?? purchaseOrder.status;

  return (
    <Document
      title={purchaseOrder.poNumber}
      author={settings.branchName}
      language="ar"
    >
      <Page size="A4" style={s.page}>
        <PdfDocFooter
          s={s}
          note="أمر شراء رسمي — يُعتد بالنسخ المطبوعة الموثّقة فقط"
        />
        <PdfDocHeader
          s={s}
          settings={settings}
          titleEn="P.O."
          titleAr="أمر شراء"
          refLine={`#${purchaseOrder.poNumber}`}
          statusLabel={statusLabel}
          statusColor={INK.muted}
          logoUri={logoUri}
        />

        <View style={s.infoRow}>
          <View style={s.datesCol}>
            <View style={s.dateRow}>
              <Text style={s.dateLabel}>{ar("الحالة")}</Text>
              <Text style={s.dateVal}>{ar(statusLabel)}</Text>
            </View>
            <View style={s.dateRow}>
              <Text style={s.dateLabel}>{ar("الإصدار")}</Text>
              <Text style={s.dateVal}>
                {arDateTime(purchaseOrder.createdAt)}
              </Text>
            </View>
            <View style={s.dateRow}>
              <Text style={s.dateLabel}>{ar("متوقع")}</Text>
              <Text style={s.dateVal}>
                {purchaseOrder.expectedDate
                  ? arDate(purchaseOrder.expectedDate)
                  : "—"}
              </Text>
            </View>
            <View style={s.dateRow}>
              <Text style={s.dateLabel}>{ar("الاستلام")}</Text>
              <Text style={s.dateVal}>
                {purchaseOrder.receivedAt
                  ? arDate(purchaseOrder.receivedAt)
                  : "—"}
              </Text>
            </View>
          </View>
          <View style={s.clientBox}>
            <Text style={s.clientLbl}>{ar("المورد")}</Text>
            <Text style={s.clientName}>{ar(supplier?.name ?? "—")}</Text>
            {supplier?.contactPerson ? (
              <Text style={s.clientSub}>{ar(supplier.contactPerson)}</Text>
            ) : null}
            {supplier?.phone ? (
              <PdfLtrText size={8.5} color={INK.muted} style={s.clientSub}>
                {supplier.phone}
              </PdfLtrText>
            ) : null}
            {supplier?.address ? (
              <Text style={s.clientSub}>{ar(supplier.address)}</Text>
            ) : null}
          </View>
        </View>

        <PdfContinuationBanner label="— تابع أصناف أمر الشراء —" />
        <PdfTable
          columns={PO_COLUMNS}
          currency={currency}
          repeatHeader
          emptyMessage="لا توجد أصناف في أمر الشراء"
          rows={purchaseOrder.items.map((item) => ({
            desc: item.productNameAr,
            qty: item.quantity,
            recv: item.receivedQuantity,
            cost: item.unitCost,
            total: item.total,
          }))}
        />

        <View style={s.totalsBox} wrap={false}>
          <View style={s.totalLine}>
            <PdfMoneyText
              amount={purchaseOrder.subtotal}
              currency={currency}
            />
            <Text style={s.totalLbl}>{ar("المجموع الفرعي")}</Text>
          </View>
          <View style={s.totalLine}>
            <PdfMoneyText
              amount={purchaseOrder.taxAmount}
              currency={currency}
            />
            <Text style={s.totalLbl}>{ar("الضريبة")}</Text>
          </View>
          <View style={s.grandBar}>
            <PdfMoneyText
              amount={purchaseOrder.total}
              currency={currency}
              style={s.grandAmt}
            />
            <Text style={s.grandLbl}>{ar("الإجمالي")}</Text>
          </View>
        </View>

        {purchaseOrder.notes ? (
          <PdfNotesBox s={s}>
            <Text style={s.notesTxt}>{arMixed(purchaseOrder.notes)}</Text>
          </PdfNotesBox>
        ) : null}

        <PdfSignatureRow
          s={s}
          left="تأكيد المورد"
          right="اعتماد المشتريات"
        />
      </Page>
    </Document>
  );
}
