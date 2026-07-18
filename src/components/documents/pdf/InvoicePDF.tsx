import React from "react";
import { Document, Image, Page, Text, View } from "@react-pdf/renderer";

import {
  invoicePaymentStatusMeta,
  PAYMENT_LABELS,
} from "@/components/documents/brand";
import {
  orderTypeLabel,
  scheduleTitle,
} from "@/components/documents/order-labels";
import {
  ar,
  arDate,
  arDateLong,
  arDateTime,
  arMixed,
  ltr,
} from "@/components/documents/pdf/arabicPDF";
import {
  PdfTable,
  type PdfColumn,
} from "@/components/documents/pdf/PdfTable";
import {
  INK,
  PDF_PAGINATION,
  PdfContinuationBanner,
  PdfDocFooter,
  PdfDocHeader,
  PdfLtrText,
  PdfMoneyText,
  PdfNotesBox,
  PdfSignatureRow,
  makePdfStyles,
  type PdfPaperSize,
} from "@/components/documents/pdf/pdfKit";
import type {
  Customer,
  Event,
  Invoice,
  Order,
  Payment,
  Settings,
} from "@/types";

const INVOICE_COLUMNS: PdfColumn[] = [
  { key: "desc", label: "الصنف", flex: 3.4, kind: "multiline", bold: true },
  { key: "qty", label: "الكمية", flex: 0.9, kind: "num" },
  { key: "price", label: "السعر", flex: 1.25, kind: "money" },
  { key: "total", label: "الإجمالي", flex: 1.35, kind: "money" },
];

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
  /** Always A4 — kept for API compatibility */
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
  logoUri,
  qrUri,
}: InvoicePdfProps) {
  const s = makePdfStyles();
  const balance = Math.max(0, order.total - order.paidAmount);
  const paymentMeta = invoicePaymentStatusMeta(order.paymentStatus);
  const statusColor = STATUS_INK[paymentMeta.tone];
  const customerName =
    customer?.name ?? order.deliveryRecipientName ?? "عميل نقدي";
  const customerPhone = customer?.phone ?? order.deliveryPhone ?? null;
  const typeLabel = orderTypeLabel(order, event);
  const currency = settings.currencySymbol;
  const hasSchedule = Boolean(order.deliveryDate);
  const showDeliveryInTotals =
    order.deliveryFee > 0 || order.type === "delivery";
  const addressHint = [order.deliveryZone, order.deliveryAddress]
    .filter(Boolean)
    .join(" · ");

  return (
    <Document
      title={`فاتورة ${invoice.invoiceNumber}`}
      author={settings.branchName}
      language="ar"
    >
      <Page size="A4" style={s.page}>
        <PdfContinuationBanner label="تتمة الفاتورة · Valentino" />
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
            marginBottom: 12,
            paddingBottom: 8,
            borderBottomWidth: 1,
            borderBottomColor: INK.goldLine,
          }}
          wrap={false}
        >
          <View style={{ alignItems: "flex-end" }}>
            <Text
              style={{
                fontSize: 8,
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
                fontSize: 16,
                fontWeight: 700,
                color: INK.text,
                fontFamily: s.page.fontFamily,
                marginTop: 2,
              }}
            >
              {ar("فاتورة")}
            </Text>
          </View>
          <View style={{ alignItems: "flex-start" }}>
            <Text style={[s.tdBold, { fontSize: 10 }]}>
              {ar("طلب")} {ltr(order.orderNumber)}
            </Text>
            <Text style={[s.td, { color: INK.muted, marginTop: 2, fontSize: 8 }]}>
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
              <PdfLtrText size={9} bold style={s.dateVal}>
                {order.orderNumber}
              </PdfLtrText>
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
              <PdfLtrText size={8.5} color={INK.muted} style={s.clientSub}>
                {customerPhone}
              </PdfLtrText>
            ) : null}
          </View>
        </View>

        {hasSchedule ? (
          <View style={s.scheduleBox} wrap={false}>
            <View style={s.scheduleHead}>
              <Text
                style={{
                  fontSize: 8.5,
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
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: INK.text,
                    fontFamily: s.page.fontFamily,
                    textAlign: "right",
                  }}
                >
                  {ar(arDateLong(order.deliveryDate!))}
                  {order.deliveryTime
                    ? ` · ${ltr(order.deliveryTime)}`
                    : ""}
                </Text>
                {addressHint ? (
                  <Text
                    style={{
                      fontSize: 8,
                      color: INK.muted,
                      fontFamily: s.page.fontFamily,
                      marginTop: 3,
                      textAlign: "right",
                    }}
                  >
                    {ar(addressHint)}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        ) : addressHint ? (
          <Text
            style={{
              fontSize: 8.5,
              color: INK.muted,
              fontFamily: s.page.fontFamily,
              textAlign: "right",
              marginBottom: 8,
            }}
          >
            {ar(addressHint)}
          </Text>
        ) : null}

        <PdfTable
          columns={INVOICE_COLUMNS}
          currency={currency}
          repeatHeader
          emptyMessage="لا توجد أصناف في هذه الفاتورة"
          rows={order.items.map((item) => ({
            desc: item.notes
              ? `${item.productNameAr}\n${item.notes}`
              : item.productNameAr,
            qty: item.quantity,
            price: item.unitPrice,
            total: item.total,
          }))}
        />

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
          {settings.taxRate > 0 || order.taxAmount > 0 ? (
            <View style={s.totalLine}>
              <PdfMoneyText amount={order.taxAmount} currency={currency} />
              <Text style={s.totalLbl}>
                {arMixed(`الضريبة (${settings.taxRate}%)`)}
              </Text>
            </View>
          ) : null}
          {showDeliveryInTotals ? (
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
                  marginBottom: 4,
                  paddingVertical: 2,
                }}
              >
                <Text style={[s.td, { color: INK.muted, fontSize: 8.5 }]}>
                  {ar(PAYMENT_LABELS[payment.method] ?? payment.method)}
                  {" · "}
                  {arDateTime(payment.createdAt)}
                </Text>
                <PdfMoneyText amount={payment.amount} currency={currency} />
              </View>
            ))}
          </View>
        ) : null}

        {order.notes ? (
          <PdfNotesBox s={s}>
            <Text style={s.notesTxt}>{arMixed(order.notes)}</Text>
          </PdfNotesBox>
        ) : null}

        <View
          style={{
            marginTop: 18,
            flexDirection: "row-reverse",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
          wrap={false}
        >
          {qrUri ? (
            <View style={{ alignItems: "center" }}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image
                src={qrUri}
                style={{
                  width: 72,
                  height: 72,
                  borderWidth: 1,
                  borderColor: INK.goldLine,
                  padding: 3,
                }}
              />
              <Text
                style={{
                  fontSize: 7.5,
                  color: INK.faint,
                  marginTop: 4,
                  fontFamily: s.page.fontFamily,
                }}
              >
                {ar("رمز التحقق")}
              </Text>
            </View>
          ) : (
            <View />
          )}
          <View style={{ width: "55%" }}>
            <PdfSignatureRow s={s} left="المستلم" right="البائع" />
          </View>
        </View>
      </Page>
    </Document>
  );
}
