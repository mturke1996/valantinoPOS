"use client";

import { forwardRef } from "react";
import { QRCodeSVG } from "qrcode.react";

import {
  DOC_FONT_STACK,
  DOC_INK,
  DOC_PAGE_A4,
  PAYMENT_LABELS,
  formatDocMoney,
  invoicePaymentStatusMeta,
} from "@/components/documents/brand";
import { DocBrandHeader, DocMetaStrip, DocTitleBand } from "@/components/documents/doc-chrome";
import { DocumentNotesBlock } from "@/components/documents/document-notes-block";
import { DocScheduleBlock } from "@/components/documents/doc-order-meta";
import { orderTypeLabel } from "@/components/documents/order-labels";
import { collectDocumentNotes } from "@/lib/documents/order-notes";
import { formatDate, formatDateTime } from "@/lib/utils";
import type {
  Customer,
  Event,
  Invoice,
  Order,
  Payment,
  Settings,
} from "@/types";

interface InvoiceA4TemplateProps {
  invoice: Invoice;
  order: Order;
  settings: Settings;
  customer: Customer | null;
  payments: Payment[];
  qrPayload: string | null;
  event?: Event | null;
}

/** Formal A4 invoice — true 210×297mm, gold accents, print-ready */
export const InvoiceA4Template = forwardRef<
  HTMLDivElement,
  InvoiceA4TemplateProps
>(function InvoiceA4Template(
  {
    invoice,
    order,
    settings,
    customer,
    payments,
    qrPayload,
    event = null,
  },
  ref,
) {
  const balance = Math.max(0, order.total - order.paidAmount);
  const paymentMeta = invoicePaymentStatusMeta(order.paymentStatus);
  const customerName =
    customer?.name ?? order.deliveryRecipientName ?? "عميل نقدي";
  const customerPhone = customer?.phone ?? order.deliveryPhone ?? null;
  const typeLabel = orderTypeLabel(order, event);
  const noteEntries = collectDocumentNotes(order, event);

  return (
    <div
      ref={ref}
      className="doc-shell overflow-hidden bg-white text-[12.5px] leading-relaxed"
      style={{
        width: DOC_PAGE_A4.width,
        minHeight: DOC_PAGE_A4.minHeight,
        color: DOC_INK.text,
        fontFamily: DOC_FONT_STACK,
      }}
      dir="rtl"
    >
      <DocBrandHeader
        settings={settings}
        titleEn="INVOICE"
        titleAr="فاتورة رسمية"
        refLine={`#${invoice.invoiceNumber}`}
        statusLabel={paymentMeta.label}
        statusTone={
          paymentMeta.tone === "success"
            ? "success"
            : paymentMeta.tone === "muted"
              ? "neutral"
              : "warning"
        }
      />

      <div className="space-y-5 px-9 py-5">
        <DocMetaStrip
          chips={[
            {
              key: "issued",
              label: "الإصدار",
              value: formatDate(invoice.createdAt, "dd/MM/yyyy"),
              ltr: true,
            },
            {
              key: "datetime",
              label: "التاريخ",
              value: formatDateTime(invoice.createdAt),
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
              valueColor:
                paymentMeta.tone === "success"
                  ? DOC_INK.success
                  : paymentMeta.tone === "danger"
                    ? DOC_INK.danger
                    : DOC_INK.goldDeep,
            },
          ]}
        />

        <div
          className="min-w-0 rounded-sm px-4 py-3"
          style={{
            borderInlineStart: `3px solid ${DOC_INK.gold}`,
            background: DOC_INK.paleGold,
          }}
        >
          <p
            className="text-[10px] font-extrabold tracking-wide"
            style={{ color: DOC_INK.goldDeep }}
          >
            إلى السيد / السادة
          </p>
          <p className="mt-1.5 text-[15px] font-extrabold">{customerName}</p>
          {customerPhone ? (
            <p
              className="num-ltr mt-1 text-[11px] tabular-nums"
              style={{ color: DOC_INK.muted }}
            >
              {customerPhone}
            </p>
          ) : null}
        </div>

        <DocScheduleBlock order={order} event={event} settings={settings} />

        <table className="w-full border-collapse text-[11.5px]">
          <thead>
            <tr
              style={{
                background: DOC_INK.paleGold,
                color: DOC_INK.goldDeep,
                borderBottom: `2px solid ${DOC_INK.gold}`,
              }}
            >
              <th className="px-3 py-3 text-start font-extrabold">الصنف</th>
              <th className="w-16 px-2 py-3 text-center font-extrabold">
                الكمية
              </th>
              <th className="w-24 px-2 py-3 text-center font-extrabold">
                السعر
              </th>
              <th className="w-28 px-3 py-3 text-end font-extrabold">
                الإجمالي
              </th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, index) => (
              <tr
                key={item.id}
                style={{
                  background: index % 2 === 1 ? DOC_INK.zebra : DOC_INK.white,
                  borderBottom: `1px solid ${DOC_INK.border}`,
                }}
              >
                <td className="px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 flex-1 font-bold">{item.productNameAr}</p>
                    {item.notes ? (
                      <div
                        className="shrink-0 max-w-[42%] rounded-sm px-2 py-1.5 text-[9.5px] leading-snug"
                        style={{
                          background: DOC_INK.paleGold,
                          border: `1px solid ${DOC_INK.goldLine}`,
                        }}
                      >
                        <span
                          className="mb-0.5 inline-block rounded-sm px-1.5 py-0.5 text-[8px] font-extrabold text-white"
                          style={{ background: DOC_INK.goldDeep }}
                        >
                          ملاحظة
                        </span>
                        <p className="mt-1" style={{ color: DOC_INK.muted }}>
                          {item.notes}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </td>
                <td className="px-2 py-3 text-center font-semibold tabular-nums">
                  {item.quantity}
                </td>
                <td className="px-2 py-3 text-center tabular-nums">
                  <span className="money-ar">
                    {formatDocMoney(item.unitPrice, settings.currencySymbol)}
                  </span>
                </td>
                <td className="px-3 py-3 text-end font-extrabold tabular-nums">
                  <span className="money-ar">
                    {formatDocMoney(item.total, settings.currencySymbol)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div
          className="ms-auto w-[46%] overflow-hidden rounded-sm text-[12px]"
          style={{ border: `1px solid ${DOC_INK.border}` }}
        >
          <div className="space-y-1.5 px-4 py-3.5">
            <TotalRow
              label="المجموع الفرعي"
              value={formatDocMoney(order.subtotal, settings.currencySymbol)}
            />
            {order.discountAmount > 0 ? (
              <TotalRow
                label="الخصم"
                value={`− ${formatDocMoney(order.discountAmount, settings.currencySymbol)}`}
              />
            ) : null}
            {settings.taxRate > 0 || order.taxAmount > 0 ? (
              <TotalRow
                label={`الضريبة (${settings.taxRate}%)`}
                value={formatDocMoney(order.taxAmount, settings.currencySymbol)}
              />
            ) : null}
            {order.deliveryFee > 0 || order.type === "delivery" ? (
              <TotalRow
                label="التوصيل"
                value={
                  order.deliveryFee > 0
                    ? formatDocMoney(order.deliveryFee, settings.currencySymbol)
                    : "مجاني"
                }
              />
            ) : null}
          </div>
          <div
            className="flex justify-between px-4 py-3.5 text-[15px] font-extrabold"
            style={{
              background: DOC_INK.paleGold,
              borderTop: `2px solid ${DOC_INK.gold}`,
              color: DOC_INK.text,
            }}
          >
            <span style={{ color: DOC_INK.goldDeep }}>الإجمالي</span>
            <span className="money-ar tabular-nums">
              {formatDocMoney(order.total, settings.currencySymbol)}
            </span>
          </div>
          <div className="space-y-1.5 px-4 py-3.5">
            <TotalRow
              label="المدفوع"
              value={formatDocMoney(order.paidAmount, settings.currencySymbol)}
            />
            {balance > 0 ? (
              <div
                className="flex justify-between font-extrabold"
                style={{ color: DOC_INK.goldDeep }}
              >
                <span>المتبقي</span>
                <span className="money-ar tabular-nums">
                  {formatDocMoney(balance, settings.currencySymbol)}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {payments.length > 0 ? (
          <div
            className="rounded-sm border px-4 py-3.5 text-[11px]"
            style={{ borderColor: DOC_INK.border, background: DOC_INK.zebra }}
          >
            <p
              className="mb-2.5 font-extrabold"
              style={{ color: DOC_INK.goldDeep }}
            >
              عمليات الدفع
            </p>
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex justify-between gap-2 py-1"
                style={{ color: DOC_INK.muted }}
              >
                <span>
                  {PAYMENT_LABELS[payment.method]} ·{" "}
                  {formatDateTime(payment.createdAt)}
                </span>
                <span className="money-ar font-semibold tabular-nums">
                  {formatDocMoney(payment.amount, settings.currencySymbol)}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        <DocumentNotesBlock entries={noteEntries} />

        <footer
          className="flex items-end justify-between gap-6 border-t pt-6"
          style={{ borderColor: DOC_INK.border }}
        >
          <div className="min-w-0 flex-1">
            <div
              className="mb-2.5 h-[2.5px] w-24"
              style={{ background: DOC_INK.gold }}
            />
            <p className="text-[12px] font-bold" style={{ color: DOC_INK.text }}>
              {settings.invoiceFooter}
            </p>
            <p className="mt-2 text-[10px]" style={{ color: DOC_INK.faint }}>
              وثيقة رسمية A4 — يُعتد بالنسخ المطبوعة الموثّقة فقط · Valentino
            </p>
            <div className="mt-8 grid grid-cols-2 gap-10">
              <div>
                <p className="mb-8 text-[11px] font-bold" style={{ color: DOC_INK.muted }}>
                  البائع
                </p>
                <div
                  className="border-t pt-1.5 text-[10px]"
                  style={{ borderColor: DOC_INK.goldLine, color: DOC_INK.faint }}
                >
                  الاسم والتوقيع
                </div>
              </div>
              <div>
                <p className="mb-8 text-[11px] font-bold" style={{ color: DOC_INK.muted }}>
                  المستلم
                </p>
                <div
                  className="border-t pt-1.5 text-[10px]"
                  style={{ borderColor: DOC_INK.goldLine, color: DOC_INK.faint }}
                >
                  الاسم والتوقيع
                </div>
              </div>
            </div>
          </div>
          {qrPayload ? (
            <div
              className="rounded-sm p-2"
              style={{ border: `1px solid ${DOC_INK.goldLine}` }}
            >
              <QRCodeSVG value={qrPayload} size={96} level="M" includeMargin />
              <p
                className="mt-1.5 text-center text-[9px] font-semibold"
                style={{ color: DOC_INK.faint }}
              >
                رمز التحقق
              </p>
            </div>
          ) : null}
        </footer>
      </div>
    </div>
  );
});

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex justify-between gap-3 py-0.5"
      style={{ color: DOC_INK.muted }}
    >
      <span>{label}</span>
      <span className="money-ar font-semibold tabular-nums">{value}</span>
    </div>
  );
}
