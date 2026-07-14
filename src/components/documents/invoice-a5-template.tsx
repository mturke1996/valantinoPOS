"use client";

import { forwardRef } from "react";
import { QRCodeSVG } from "qrcode.react";

import {
  DOC_FONT_STACK,
  DOC_INK,
  PAYMENT_LABELS,
  formatDocMoney,
  getDocPage,
  invoicePaymentStatusMeta,
  type DocPaperSize,
} from "@/components/documents/brand";
import { DocBrandHeader, DocTitleBand } from "@/components/documents/doc-chrome";
import {
  DocScheduleBlock,
  orderTypeLabel,
} from "@/components/documents/doc-order-meta";
import { formatDate, formatDateTime } from "@/lib/utils";
import type {
  Customer,
  Event,
  Invoice,
  Order,
  Payment,
  Settings,
} from "@/types";

interface InvoiceA5TemplateProps {
  invoice: Invoice;
  order: Order;
  settings: Settings;
  customer: Customer | null;
  payments: Payment[];
  qrPayload: string | null;
  event?: Event | null;
  /** Formal paper size — A5 compact or A4 full */
  paperSize?: DocPaperSize;
}

/** Formal invoice — white paper + gold accents (A4 or A5) */
export const InvoiceA5Template = forwardRef<
  HTMLDivElement,
  InvoiceA5TemplateProps
>(function InvoiceA5Template(
  {
    invoice,
    order,
    settings,
    customer,
    payments,
    qrPayload,
    event = null,
    paperSize = "a5",
  },
  ref,
) {
  const page = getDocPage(paperSize);
  const compact = paperSize === "a5";
  const balance = Math.max(0, order.total - order.paidAmount);
  const paymentMeta = invoicePaymentStatusMeta(order.paymentStatus);
  const customerName =
    customer?.name ?? order.deliveryRecipientName ?? "عميل نقدي";
  const customerPhone = customer?.phone ?? order.deliveryPhone ?? null;
  const typeLabel = orderTypeLabel(order, event);

  return (
    <div
      ref={ref}
      className={`doc-shell overflow-hidden bg-white leading-relaxed ${compact ? "text-[11px]" : "text-[12px]"}`}
      style={{
        width: page.width,
        minHeight: page.minHeight,
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
        compact={compact}
      />

      <div className={compact ? "space-y-3.5 px-5 py-4" : "space-y-5 px-8 py-6"}>
        <DocTitleBand
          titleEn="INVOICE"
          titleAr="فاتورة ضريبية"
          compact={compact}
          meta={
            <>
              <p className="font-semibold">طلب {order.orderNumber}</p>
              <p className="mt-1 tabular-nums">
                {formatDateTime(invoice.createdAt)}
              </p>
            </>
          }
        />

        <div className={compact ? "flex gap-4" : "flex gap-6"}>
          <div className={`space-y-2 ${compact ? "w-[38%]" : "w-[36%]"}`}>
            <MetaRow
              label="الإصدار"
              value={formatDate(invoice.createdAt, "dd/MM/yyyy")}
            />
            <MetaRow
              label="الحالة"
              value={paymentMeta.short}
              valueColor={
                paymentMeta.tone === "success"
                  ? DOC_INK.success
                  : paymentMeta.tone === "danger"
                    ? DOC_INK.danger
                    : DOC_INK.goldDeep
              }
            />
            <MetaRow label="العملة" value={settings.currencySymbol} />
            <MetaRow label="نوع الطلب" value={typeLabel} />
          </div>
          <div
            className={`min-w-0 flex-1 rounded-sm ${compact ? "px-3 py-2" : "px-4 py-3"}`}
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
            <p className={`mt-1.5 font-extrabold ${compact ? "text-[13px]" : "text-[15px]"}`}>
              {customerName}
            </p>
            {customerPhone ? (
              <p
                className="num-ltr mt-1 tabular-nums text-[12px]"
                style={{ color: DOC_INK.muted }}
              >
                {customerPhone}
              </p>
            ) : null}
          </div>
        </div>

        <DocScheduleBlock
          order={order}
          event={event}
          settings={settings}
          compact={compact}
        />

        <table className={`w-full border-collapse ${compact ? "text-[10px]" : "text-[11px]"}`}>
          <thead>
            <tr
              style={{
                background: DOC_INK.paleGold,
                color: DOC_INK.goldDeep,
                borderBottom: `2px solid ${DOC_INK.gold}`,
              }}
            >
              <th className={`text-start font-extrabold ${compact ? "px-2 py-2" : "px-3 py-3"}`}>
                الصنف
              </th>
              <th className={`text-center font-extrabold ${compact ? "w-12 px-1 py-2" : "w-16 px-2 py-3"}`}>
                الكمية
              </th>
              <th className={`text-center font-extrabold ${compact ? "w-16 px-1 py-2" : "w-20 px-2 py-3"}`}>
                السعر
              </th>
              <th className={`text-end font-extrabold ${compact ? "w-[72px] px-2 py-2" : "w-28 px-3 py-3"}`}>
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
                <td className={compact ? "px-2 py-2" : "px-3 py-3"}>
                  <p className="font-bold">{item.productNameAr}</p>
                  {item.notes ? (
                    <p className="text-[10px]" style={{ color: DOC_INK.faint }}>
                      {item.notes}
                    </p>
                  ) : null}
                </td>
                <td className={`text-center tabular-nums font-semibold ${compact ? "px-1 py-2" : "px-2 py-3"}`}>
                  {item.quantity}
                </td>
                <td className={`text-center tabular-nums ${compact ? "px-1 py-2" : "px-2 py-3"}`}>
                  <span className="money-ar">
                    {formatDocMoney(item.unitPrice, settings.currencySymbol)}
                  </span>
                </td>
                <td
                  className={`text-end tabular-nums font-extrabold ${compact ? "px-2 py-2" : "px-3 py-3"}`}
                >
                  <span className="money-ar">
                    {formatDocMoney(item.total, settings.currencySymbol)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div
          className={`ms-auto overflow-hidden rounded-sm ${compact ? "w-[60%] text-[10px]" : "w-[48%] text-[12px]"}`}
          style={{ border: `1px solid ${DOC_INK.border}` }}
        >
          <div className={`space-y-1 ${compact ? "px-3 py-2" : "px-4 py-3"}`}>
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
            <TotalRow
              label={`الضريبة (${settings.taxRate}%)`}
              value={formatDocMoney(order.taxAmount, settings.currencySymbol)}
            />
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
            className={`flex justify-between font-extrabold ${compact ? "px-3 py-2 text-[12px]" : "px-4 py-3 text-[14px]"}`}
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
          <div className={`space-y-1 ${compact ? "px-3 py-2" : "px-4 py-3"}`}>
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
            className={`rounded-sm border ${compact ? "px-3 py-2 text-[9px]" : "px-4 py-3 text-[11px]"}`}
            style={{ borderColor: DOC_INK.border, background: DOC_INK.zebra }}
          >
            <p
              className="mb-2 font-extrabold"
              style={{ color: DOC_INK.goldDeep }}
            >
              عمليات الدفع
            </p>
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex justify-between gap-2 py-0.5"
                style={{ color: DOC_INK.muted }}
              >
                <span>
                  {PAYMENT_LABELS[payment.method]} ·{" "}
                  {formatDateTime(payment.createdAt)}
                </span>
                <span className="money-ar tabular-nums font-semibold">
                  {formatDocMoney(payment.amount, settings.currencySymbol)}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        {order.notes ? (
          <div
            className={`rounded-sm ${compact ? "px-3 py-2 text-[10px]" : "px-4 py-3 text-[12px]"}`}
            style={{
              background: DOC_INK.paleGold,
              borderInlineStart: `3px solid ${DOC_INK.gold}`,
            }}
          >
            <p className="font-extrabold" style={{ color: DOC_INK.text }}>
              ملاحظات
            </p>
            <p className="mt-1" style={{ color: DOC_INK.muted }}>
              {order.notes}
            </p>
          </div>
        ) : null}

        <footer
          className={`flex items-end justify-between gap-4 border-t ${compact ? "pt-3" : "pt-5"}`}
          style={{ borderColor: DOC_INK.border }}
        >
          <div className="min-w-0 flex-1">
            <div
              className="mb-2 h-[2px] w-20"
              style={{ background: DOC_INK.gold }}
            />
            <p className={`font-bold ${compact ? "text-[10px]" : "text-[12px]"}`} style={{ color: DOC_INK.text }}>
              {settings.invoiceFooter}
            </p>
            <p className="mt-1.5 text-[10px]" style={{ color: DOC_INK.faint }}>
              وثيقة رسمية — يُعتد بالنسخ المطبوعة الموثّقة فقط · Valentino
            </p>
          </div>
          {qrPayload ? (
            <div
              className="rounded-sm p-1.5"
              style={{ border: `1px solid ${DOC_INK.goldLine}` }}
            >
              <QRCodeSVG
                value={qrPayload}
                size={compact ? 68 : 88}
                level="M"
                includeMargin
              />
            </div>
          ) : null}
        </footer>
      </div>
    </div>
  );
});

function MetaRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex justify-between gap-2 text-[12px]">
      <span style={{ color: DOC_INK.faint }}>{label}</span>
      <span
        className="font-bold tabular-nums"
        style={{ color: valueColor ?? DOC_INK.text }}
      >
        {value}
      </span>
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex justify-between gap-3 py-0.5"
      style={{ color: DOC_INK.muted }}
    >
      <span>{label}</span>
      <span className="money-ar tabular-nums font-semibold">
        {value}
      </span>
    </div>
  );
}
