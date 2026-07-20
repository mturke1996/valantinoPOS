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
  PdfItemDescCell,
  PdfLtrText,
  PdfMoneyText,
  PdfNotesSection,
  PdfSignatureRow,
  makePdfStyles,
  type PdfPaperSize,
} from "@/components/documents/pdf/pdfKit";
import { collectDocumentNotes } from "@/lib/documents/order-notes";
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
  const noteEntries = collectDocumentNotes(order, event);

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
          metaChips={[
            {
              key: "issued",
              label: "الإصدار",
              value: arDate(invoice.createdAt),
              ltr: true,
            },
            {
              key: "datetime",
              label: "التاريخ",
              value: arDateTime(invoice.createdAt),
              ltr: true,
            },
            {
              key: "order",
              label: "الطلب",
              value: order.orderNumber,
              ltr: true,
            },
            {
              key: "type",
              label: "النوع",
              value: typeLabel,
            },
            {
              key: "status",
              label: "الحالة",
              value: paymentMeta.short,
              color: statusColor,
            },
          ]}
        />

        <View style={[s.clientBox, { marginBottom: 14 }]} wrap={false}>
          <Text style={s.clientLbl}>{ar("إلى السيد / السادة")}</Text>
          <Text style={s.clientName}>{ar(customerName)}</Text>
          {customerPhone ? (
            <PdfLtrText size={8.5} color={INK.muted} style={s.clientSub}>
              {customerPhone}
            </PdfLtrText>
          ) : null}
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
            desc: (
              <PdfItemDescCell
                s={s}
                name={item.productNameAr}
                note={item.notes}
              />
            ),
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

        <PdfNotesSection s={s} entries={noteEntries} />

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
