import { Document, Image, Page, Text, View } from "@react-pdf/renderer";

import {
  invoicePaymentStatusMeta,
  PAYMENT_LABELS,
} from "@/components/documents/brand";
import {
  ar,
  arDate,
  arDateLong,
  arDateTime,
} from "@/components/documents/pdf/arabicPDF";
import {
  INK,
  PDF_PAGINATION,
  PdfContinuationBanner,
  PdfDocFooter,
  PdfDocHeader,
  PdfMoneyText,
  PdfNotesBox,
  makePdfStyles,
  type PdfPaperSize,
} from "@/components/documents/pdf/pdfKit";
import {
  orderTypeLabel,
  scheduleTitle,
} from "@/components/documents/doc-order-meta";
import type {
  Customer,
  Event,
  Invoice,
  Order,
  Payment,
  Settings,
} from "@/types";

const cols = {
  desc: { flex: 1, textAlign: "right" as const, paddingRight: 4 },
  qty: { width: 44, textAlign: "center" as const },
  price: { width: 72, textAlign: "center" as const },
  total: { width: 80, textAlign: "left" as const, paddingLeft: 4 },
};

const STATUS_INK = {
  success: INK.success,
  warning: INK.goldDeep,
  danger: INK.danger,
  muted: INK.muted,
} as const;

export interface InvoicePdfProps {
  invoice: Invoice;
  order: Order;
  settings: Settings;
  customer: Customer | null;
  payments: Payment[];
  event?: Event | null;
  paperSize?: PdfPaperSize;
  logoUri?: string | null;
  qrUri?: string | null;
}

export function InvoicePDF({
  invoice,
  order,
  settings,
  customer,
  payments,
  event = null,
  paperSize = "A4",
  logoUri,
  qrUri,
}: InvoicePdfProps) {
  const compact = paperSize === "A5";
  const s = makePdfStyles(compact);
  const balance = Math.max(0, order.total - order.paidAmount);
  const paymentMeta = invoicePaymentStatusMeta(order.paymentStatus);
  const statusColor = STATUS_INK[paymentMeta.tone];
  const customerName =
    customer?.name ?? order.deliveryRecipientName ?? "عميل نقدي";
  const customerPhone = customer?.phone ?? order.deliveryPhone ?? null;
  const typeLabel = orderTypeLabel(order, event);
  const currency = settings.currencySymbol;
  const hasSchedule = Boolean(order.deliveryDate);
  const hasDelivery =
    Boolean(order.deliveryAddress) ||
    Boolean(order.deliveryZone) ||
    order.deliveryFee > 0 ||
    order.type === "delivery";

  return (
    <Document
      title={`فاتورة ${invoice.invoiceNumber}`}
      author={settings.branchName}
      language="ar"
    >
      <Page size={paperSize} style={s.page}>
        <PdfDocFooter
          s={s}
          note={
            settings.invoiceFooter ||
            "وثيقة رسمية — يُعتد بالنسخ المطبوعة الموثّقة فقط"
          }
        />
        <PdfDocHeader
          s={s}
          settings={settings}
          titleEn="INVOICE"
          titleAr="فاتورة رسمية"
          refLine={`#${invoice.invoiceNumber}`}
          statusLabel={paymentMeta.label}
          statusColor={statusColor}
          logoUri={logoUri}
        />

        <View
          style={{
            flexDirection: "row-reverse",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: compact ? 10 : 14,
            paddingBottom: 8,
            borderBottomWidth: 1,
            borderBottomColor: INK.goldLine,
          }}
          wrap={false}
        >
          <View style={{ alignItems: "flex-end" }}>
            <Text
              style={{
                fontSize: compact ? 8 : 9,
                fontWeight: 700,
                color: INK.goldDeep,
                fontFamily: s.page.fontFamily,
                letterSpacing: 1,
              }}
            >
              INVOICE
            </Text>
            <Text
              style={{
                fontSize: compact ? 14 : 16,
                fontWeight: 700,
                color: INK.text,
                fontFamily: s.page.fontFamily,
                marginTop: 2,
              }}
            >
              {ar("فاتورة ضريبية")}
            </Text>
          </View>
          <View style={{ alignItems: "flex-start" }}>
            <Text style={[s.tdBold, { fontSize: compact ? 8 : 9 }]}>
              {ar(`طلب ${order.orderNumber}`)}
            </Text>
            <Text style={[s.td, { color: INK.muted, marginTop: 2 }]}>
              {arDateTime(invoice.createdAt)}
            </Text>
          </View>
        </View>

        <View style={s.infoRow}>
          <View style={s.datesCol}>
            <View style={s.dateRow}>
              <Text style={s.dateLabel}>{ar("الإصدار")}</Text>
              <Text style={s.dateVal}>{arDate(invoice.createdAt)}</Text>
            </View>
            <View style={s.dateRow}>
              <Text style={s.dateLabel}>{ar("الطلب")}</Text>
              <Text style={s.dateVal}>{order.orderNumber}</Text>
            </View>
            <View style={s.dateRow}>
              <Text style={s.dateLabel}>{ar("النوع")}</Text>
              <Text style={s.dateVal}>{ar(typeLabel)}</Text>
            </View>
            <View style={s.dateRow}>
              <Text style={s.dateLabel}>{ar("الحالة")}</Text>
              <Text style={[s.dateVal, { color: statusColor }]}>
                {ar(paymentMeta.short)}
              </Text>
            </View>
          </View>
          <View style={s.clientBox}>
            <Text style={s.clientLbl}>{ar("إلى السيد / السادة")}</Text>
            <Text style={s.clientName}>{ar(customerName)}</Text>
            {customerPhone ? (
              <Text style={s.clientSub}>{customerPhone}</Text>
            ) : null}
          </View>
        </View>

        {hasSchedule ? (
          <View style={s.scheduleBox} wrap={false}>
            <View style={s.scheduleHead}>
              <Text
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  color: INK.goldDeep,
                  fontFamily: s.page.fontFamily,
                }}
              >
                {ar(scheduleTitle(order))}
              </Text>
              <Text
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  color: INK.goldDeep,
                  fontFamily: s.page.fontFamily,
                }}
              >
                {ar(typeLabel)}
              </Text>
            </View>
            <View style={s.scheduleBody}>
              <View style={{ alignItems: "flex-end", flex: 1 }}>
                <Text style={s.clientName}>
                  {ar(arDateLong(order.deliveryDate!))}
                </Text>
                {event?.guestCount ? (
                  <Text style={s.clientSub}>
                    {ar(`${event.guestCount} ضيف/قطعة`)}
                  </Text>
                ) : null}
              </View>
              <View
                style={{
                  borderWidth: 1.5,
                  borderColor: INK.gold,
                  borderRadius: 2,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  alignItems: "center",
                  minWidth: 64,
                }}
              >
                <Text
                  style={{
                    fontSize: 7.5,
                    fontWeight: 700,
                    color: INK.goldDeep,
                    fontFamily: s.page.fontFamily,
                  }}
                >
                  {ar("الساعة")}
                </Text>
                <Text style={[s.clientName, { marginTop: 2 }]}>
                  {order.deliveryTime || "—"}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {hasDelivery ? (
          <View style={s.kvCard} wrap={false}>
            <Text style={s.sectionTitle}>{ar("تفاصيل التوصيل")}</Text>
            <View style={s.kvGrid}>
              {order.deliveryRecipientName ? (
                <View style={s.kvItem}>
                  <Text style={s.kvLabel}>{ar("المستلم")}</Text>
                  <Text style={s.kvValue}>
                    {ar(order.deliveryRecipientName)}
                  </Text>
                </View>
              ) : null}
              {order.deliveryPhone ? (
                <View style={s.kvItem}>
                  <Text style={s.kvLabel}>{ar("الهاتف")}</Text>
                  <Text style={s.kvValue}>{order.deliveryPhone}</Text>
                </View>
              ) : null}
              {order.deliveryZone ? (
                <View style={s.kvItem}>
                  <Text style={s.kvLabel}>{ar("المنطقة")}</Text>
                  <Text style={s.kvValue}>{ar(order.deliveryZone)}</Text>
                </View>
              ) : null}
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
              {order.deliveryAddress ? (
                <View style={[s.kvItem, { width: "100%" }]}>
                  <Text style={s.kvLabel}>{ar("مكان التوصيل")}</Text>
                  <Text style={s.kvValue}>{ar(order.deliveryAddress)}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        <View
          style={s.tableHead}
          wrap={false}
          minPresenceAhead={PDF_PAGINATION.tableHead}
        >
          <Text style={[s.th, cols.total]}>{ar("الإجمالي")}</Text>
          <Text style={[s.th, cols.price]}>{ar("السعر")}</Text>
          <Text style={[s.th, cols.qty]}>{ar("الكمية")}</Text>
          <Text style={[s.th, cols.desc]}>{ar("الصنف")}</Text>
        </View>
        <PdfContinuationBanner
          compact={compact}
          label="— تابع أصناف الفاتورة —"
        />
        {order.items.map((item, i) => (
          <View
            key={item.id}
            style={[s.tableRow, i % 2 === 1 ? s.rowEven : {}]}
            wrap={false}
          >
            <View style={cols.total}>
              <PdfMoneyText amount={item.total} currency={currency} />
            </View>
            <PdfMoneyText
              amount={item.unitPrice}
              currency={currency}
              containerStyle={cols.price}
            />
            <Text style={[s.td, cols.qty]}>{item.quantity}</Text>
            <View style={cols.desc}>
              <Text style={s.tdBold}>{ar(item.productNameAr)}</Text>
              {item.notes ? (
                <Text style={[s.td, { color: INK.faint, fontSize: 7.5 }]}>
                  {ar(item.notes)}
                </Text>
              ) : null}
            </View>
          </View>
        ))}

        <View style={s.totalsBox} wrap={false}>
          <View style={s.totalLine}>
            <PdfMoneyText amount={order.subtotal} currency={currency} />
            <Text style={s.totalLbl}>{ar("المجموع الفرعي")}</Text>
          </View>
          {order.discountAmount > 0 ? (
            <View style={s.totalLine}>
              <PdfMoneyText
                amount={order.discountAmount}
                currency={currency}
              />
              <Text style={s.totalLbl}>{ar("الخصم")}</Text>
            </View>
          ) : null}
          <View style={s.totalLine}>
            <PdfMoneyText amount={order.taxAmount} currency={currency} />
            <Text style={s.totalLbl}>
              {ar(`الضريبة (${settings.taxRate}%)`)}
            </Text>
          </View>
          {order.deliveryFee > 0 || order.type === "delivery" ? (
            <View style={s.totalLine}>
              {order.deliveryFee > 0 ? (
                <PdfMoneyText
                  amount={order.deliveryFee}
                  currency={currency}
                />
              ) : (
                <Text style={s.totalVal}>{ar("مجاني")}</Text>
              )}
              <Text style={s.totalLbl}>{ar("التوصيل")}</Text>
            </View>
          ) : null}
          <View style={s.grandBar} minPresenceAhead={PDF_PAGINATION.totalBar}>
            <PdfMoneyText
              amount={order.total}
              currency={currency}
              style={s.grandAmt}
            />
            <Text style={s.grandLbl}>{ar("الإجمالي")}</Text>
          </View>
          <View style={s.totalLine}>
            <PdfMoneyText amount={order.paidAmount} currency={currency} />
            <Text style={s.totalLbl}>{ar("المدفوع")}</Text>
          </View>
          {balance > 0 ? (
            <View style={s.totalLine}>
              <PdfMoneyText
                amount={balance}
                currency={currency}
                style={{ color: INK.goldDeep }}
              />
              <Text
                style={[s.totalLbl, { color: INK.goldDeep, fontWeight: 700 }]}
              >
                {ar("المتبقي")}
              </Text>
            </View>
          ) : null}
        </View>

        {payments.length > 0 ? (
          <View style={{ marginTop: 12 }} wrap={false}>
            <Text style={s.sectionTitle}>{ar("عمليات الدفع")}</Text>
            {payments.map((payment) => (
              <View
                key={payment.id}
                style={{
                  flexDirection: "row-reverse",
                  justifyContent: "space-between",
                  marginBottom: 3,
                }}
              >
                <Text style={[s.td, { color: INK.muted }]}>
                  {ar(
                    `${PAYMENT_LABELS[payment.method] ?? payment.method} · ${arDateTime(payment.createdAt)}`,
                  )}
                </Text>
                <PdfMoneyText amount={payment.amount} currency={currency} />
              </View>
            ))}
          </View>
        ) : null}

        {order.notes ? (
          <PdfNotesBox s={s}>
            <Text style={s.notesTxt}>{ar(order.notes)}</Text>
          </PdfNotesBox>
        ) : null}

        {qrUri ? (
          <View
            style={{
              marginTop: 14,
              alignItems: "flex-start",
              alignSelf: "flex-start",
            }}
            wrap={false}
          >
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image
              src={qrUri}
              style={{
                width: compact ? 64 : 80,
                height: compact ? 64 : 80,
                borderWidth: 1,
                borderColor: INK.goldLine,
                padding: 4,
              }}
            />
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
