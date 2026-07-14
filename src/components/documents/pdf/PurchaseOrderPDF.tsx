import { Document, Page, Text, View } from "@react-pdf/renderer";

import { PO_STATUS_LABELS } from "@/components/documents/brand";
import { ar, arDate, arDateTime } from "@/components/documents/pdf/arabicPDF";
import {
  INK,
  PDF_PAGINATION,
  PdfContinuationBanner,
  PdfDocFooter,
  PdfDocHeader,
  PdfMoneyText,
  PdfNotesBox,
  PdfSignatureRow,
  makePdfStyles,
} from "@/components/documents/pdf/pdfKit";
import type { PurchaseOrder, Settings, Supplier } from "@/types";

const cols = {
  desc: { flex: 1, textAlign: "right" as const },
  qty: { width: 44, textAlign: "center" as const },
  recv: { width: 44, textAlign: "center" as const },
  cost: { width: 70, textAlign: "center" as const },
  total: { width: 80, textAlign: "left" as const },
};

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
              <Text style={s.clientSub}>{supplier.phone}</Text>
            ) : null}
            {supplier?.address ? (
              <Text style={s.clientSub}>{ar(supplier.address)}</Text>
            ) : null}
          </View>
        </View>

        <View
          style={s.tableHead}
          wrap={false}
          minPresenceAhead={PDF_PAGINATION.tableHead}
        >
          <Text style={[s.th, cols.total]}>{ar("الإجمالي")}</Text>
          <Text style={[s.th, cols.cost]}>{ar("التكلفة")}</Text>
          <Text style={[s.th, cols.recv]}>{ar("المستلم")}</Text>
          <Text style={[s.th, cols.qty]}>{ar("الكمية")}</Text>
          <Text style={[s.th, cols.desc]}>{ar("الصنف")}</Text>
        </View>
        <PdfContinuationBanner label="— تابع أصناف أمر الشراء —" />
        {purchaseOrder.items.map((item, i) => (
          <View
            key={item.id}
            style={[s.tableRow, i % 2 === 1 ? s.rowEven : {}]}
            wrap={false}
          >
            <View style={cols.total}>
              <PdfMoneyText amount={item.total} currency={currency} />
            </View>
            <PdfMoneyText
              amount={item.unitCost}
              currency={currency}
              containerStyle={cols.cost}
            />
            <Text style={[s.td, cols.recv]}>{item.receivedQuantity}</Text>
            <Text style={[s.td, cols.qty]}>{item.quantity}</Text>
            <Text style={[s.tdBold, cols.desc]}>
              {ar(item.productNameAr)}
            </Text>
          </View>
        ))}

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
            <Text style={s.notesTxt}>{ar(purchaseOrder.notes)}</Text>
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
