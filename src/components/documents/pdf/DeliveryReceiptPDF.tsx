import { Document, Page, Text, View } from "@react-pdf/renderer";

import { ar, arDate, arDateTime } from "@/components/documents/pdf/arabicPDF";
import {
  INK,
  PDF_PAGINATION,
  PdfContinuationBanner,
  PdfDocFooter,
  PdfDocHeader,
  PdfMoneyText,
  PdfSignatureRow,
  makePdfStyles,
} from "@/components/documents/pdf/pdfKit";
import type { Customer, Order, Settings } from "@/types";

const cols = {
  desc: { flex: 1, textAlign: "right" as const },
  qty: { width: 52, textAlign: "center" as const },
  total: { width: 90, textAlign: "left" as const },
  check: { width: 40, textAlign: "center" as const },
};

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
              <Text style={s.kvValue}>{phone}</Text>
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
                  {ar(order.deliveryInstructions)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <Text style={[s.td, { color: INK.faint, marginBottom: 8 }]}>
          {arDateTime(order.createdAt)}
        </Text>

        <View
          style={s.tableHead}
          wrap={false}
          minPresenceAhead={PDF_PAGINATION.tableHead}
        >
          {!hidePrices ? (
            <Text style={[s.th, cols.total]}>{ar("القيمة")}</Text>
          ) : (
            <Text style={[s.th, cols.check]}>✓</Text>
          )}
          <Text style={[s.th, cols.qty]}>{ar("الكمية")}</Text>
          <Text style={[s.th, cols.desc]}>{ar("الصنف")}</Text>
        </View>
        <PdfContinuationBanner label="— تابع أصناف التسليم —" />
        {order.items.map((item, i) => (
          <View
            key={item.id}
            style={[s.tableRow, i % 2 === 1 ? s.rowEven : {}]}
            wrap={false}
          >
            {!hidePrices ? (
              <View style={cols.total}>
                <PdfMoneyText amount={item.total} currency={currency} />
              </View>
            ) : (
              <Text style={[s.td, cols.check, { color: INK.faint }]}>☐</Text>
            )}
            <Text style={[s.td, cols.qty]}>{item.quantity}</Text>
            <Text style={[s.tdBold, cols.desc]}>
              {ar(item.productNameAr)}
            </Text>
          </View>
        ))}

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
