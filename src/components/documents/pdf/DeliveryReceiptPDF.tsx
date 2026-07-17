import { Document, Page, Text, View } from "@react-pdf/renderer";

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
  PdfSignatureRow,
  makePdfStyles,
} from "@/components/documents/pdf/pdfKit";
import type { Customer, Order, Settings } from "@/types";

const PRICE_COLUMNS: PdfColumn[] = [
  { key: "desc", label: "الصنف", flex: 3.5, kind: "multiline", bold: true },
  { key: "qty", label: "الكمية", flex: 1, kind: "num" },
  { key: "total", label: "القيمة", flex: 1.5, kind: "money" },
];

const CHECK_COLUMNS: PdfColumn[] = [
  { key: "desc", label: "الصنف", flex: 3.5, kind: "multiline", bold: true },
  { key: "qty", label: "الكمية", flex: 1, kind: "num" },
  { key: "check", label: "✓", flex: 0.7, kind: "check" },
];

export interface DeliveryReceiptPdfProps {
  order: Order;
  settings: Settings;
  customer: Customer | null;
  hidePrices?: boolean;
  logoUri?: string | null;
}

export function DeliveryReceiptPDF({
  order,
  settings,
  customer,
  hidePrices = false,
  logoUri,
}: DeliveryReceiptPdfProps) {
  const s = makePdfStyles(false);
  const currency = settings.currencySymbol;
  const recipient =
    order.deliveryRecipientName ?? customer?.name ?? "مستلم";
  const phone = order.deliveryPhone ?? customer?.phone ?? "—";
  const balance = Math.max(0, order.total - order.paidAmount);

  return (
    <Document
      title={`تسليم ${order.orderNumber}`}
      author={settings.branchName}
      language="ar"
    >
      <Page size="A4" style={s.page}>
        <PdfDocFooter
          s={s}
          note="وثيقة تسليم — يُرجى التحقق من الأصناف قبل التوقيع"
        />
        <PdfDocHeader
          s={s}
          settings={settings}
          titleEn="DELIVERY"
          titleAr="واصل استلام"
          refLine={`#${order.orderNumber}`}
          logoUri={logoUri}
        />

        <View style={s.kvCard} wrap={false}>
          <View style={s.kvGrid}>
            <View style={s.kvItem}>
              <Text style={s.kvLabel}>{ar("المستلم")}</Text>
              <Text style={s.kvValue}>{ar(recipient)}</Text>
            </View>
            <View style={s.kvItem}>
              <Text style={s.kvLabel}>{ar("الهاتف")}</Text>
              <PdfLtrText size={10} bold style={s.kvValue}>
                {phone}
              </PdfLtrText>
            </View>
            <View style={s.kvItem}>
              <Text style={s.kvLabel}>{ar("موعد التسليم")}</Text>
              <Text style={s.kvValue}>
                {ar(
                  [
                    order.deliveryDate
                      ? arDate(order.deliveryDate)
                      : "—",
                    order.deliveryTime,
                  ]
                    .filter(Boolean)
                    .join(" · "),
                )}
              </Text>
            </View>
            <View style={s.kvItem}>
              <Text style={s.kvLabel}>{ar("المنطقة")}</Text>
              <Text style={s.kvValue}>{ar(order.deliveryZone ?? "—")}</Text>
            </View>
            <View style={s.kvItem}>
              <Text style={s.kvLabel}>{ar("سعر التوصيل")}</Text>
              {order.deliveryFee > 0 ? (
                <PdfMoneyText
                  amount={order.deliveryFee}
                  currency={currency}
                />
              ) : (
                <Text style={s.kvValue}>{ar("مجاني")}</Text>
              )}
            </View>
            <View style={[s.kvItem, { width: "100%" }]}>
              <Text style={s.kvLabel}>{ar("مكان التوصيل")}</Text>
              <Text style={s.kvValue}>
                {ar(order.deliveryAddress ?? "—")}
              </Text>
            </View>
            {order.deliveryInstructions ? (
              <View style={[s.kvItem, { width: "100%" }]}>
                <Text style={s.kvLabel}>{ar("تعليمات")}</Text>
                <Text style={s.kvValue}>
                  {arMixed(order.deliveryInstructions)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <Text style={[s.td, { color: INK.faint, marginBottom: 8 }]}>
          {arDateTime(order.createdAt)}
        </Text>

        <PdfContinuationBanner label="— تابع أصناف التسليم —" />
        <PdfTable
          columns={hidePrices ? CHECK_COLUMNS : PRICE_COLUMNS}
          currency={currency}
          repeatHeader
          emptyMessage="لا توجد أصناف للتسليم"
          rows={order.items.map((item) => {
            const row: Record<string, string | number> = {
              desc: item.productNameAr,
              qty: item.quantity,
            };
            if (hidePrices) row.check = "☐";
            else row.total = item.total;
            return row;
          })}
        />

        {!hidePrices ? (
          <View
            style={[
              s.grandBar,
              {
                width: 240,
                alignSelf: "flex-start",
                marginTop: 12,
                borderWidth: 1,
                borderColor: INK.goldLine,
                borderRadius: 2,
              },
            ]}
            wrap={false}
          >
            <PdfMoneyText
              amount={balance}
              currency={currency}
              style={s.grandAmt}
            />
            <Text style={s.grandLbl}>{ar("المطلوب تحصيله")}</Text>
          </View>
        ) : null}

        <PdfSignatureRow s={s} left="توقيع المندوب" right="توقيع المستلم" />
      </Page>
    </Document>
  );
}
