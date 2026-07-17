"use client";

import { forwardRef } from "react";
import { QRCodeSVG } from "qrcode.react";

import {
  DOC_FONT_STACK,
  PAYMENT_LABELS,
  formatDocMoney,
  resolveDocLogoUrl,
} from "@/components/documents/brand";
import {
  orderTypeLabel,
  scheduleTitle,
} from "@/components/documents/doc-order-meta";
import { formatDate, formatDateTime } from "@/lib/utils";
import type {
  Event,
  Invoice,
  Order,
  Payment,
  PaymentMethod,
  Settings,
} from "@/types";

interface InvoiceThermalTemplateProps {
  invoice: Invoice | null;
  order: Order;
  settings: Settings;
  payment?: Payment | null;
  qrPayload?: string | null;
  event?: Event | null;
  title?: string;
}

export const InvoiceThermalTemplate = forwardRef<
  HTMLDivElement,
  InvoiceThermalTemplateProps
>(function InvoiceThermalTemplate(
  {
    invoice,
    order,
    settings,
    payment,
    qrPayload,
    event = null,
    title = "فاتورة",
  },
  ref,
) {
  const docNumber = invoice?.invoiceNumber ?? order.orderNumber;
  const balance = Math.max(0, order.total - order.paidAmount);
  const logoUrl = resolveDocLogoUrl(settings);
  const hasDelivery =
    Boolean(order.deliveryAddress) ||
    Boolean(order.deliveryZone) ||
    order.deliveryFee > 0 ||
    order.type === "delivery";

  return (
    <div
      ref={ref}
      dir="rtl"
      style={{ fontFamily: DOC_FONT_STACK }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoUrl} alt={settings.branchName} className="logo" />
      <div className="center bold" style={{ fontSize: "1.15em", marginBottom: 1 }}>
        {settings.branchName}
      </div>
      {settings.branchPhone ? (
        <div className="center muted" style={{ fontSize: "0.75em", lineHeight: 1.2 }}>
          {settings.branchPhone}
        </div>
      ) : null}
      {settings.branchAddress ? (
        <div
          className="center muted"
          style={{ marginBottom: 4, fontSize: "0.7em", lineHeight: 1.2 }}
        >
          {settings.branchAddress}
        </div>
      ) : (
        <div style={{ marginBottom: 4 }} />
      )}
      <div className="center">
        <span className="chip">{title}</span>
      </div>
      <div className="line" />
      <div className="row">
        <span>الرقم</span>
        <span className="tabular bold">{docNumber}</span>
      </div>
      {invoice ? (
        <div className="row">
          <span>الطلب</span>
          <span className="tabular">{order.orderNumber}</span>
        </div>
      ) : null}
      <div className="row" style={{ fontSize: "0.85em" }}>
        <span>النوع</span>
        <span>{orderTypeLabel(order, event)}</span>
      </div>
      <div className="row">
        <span>التاريخ</span>
        <span className="tabular">
          {formatDateTime(invoice?.createdAt ?? order.createdAt)}
        </span>
      </div>

      {order.deliveryDate ? (
        <>
          <div className="line" />
          <div className="center bold" style={{ marginBottom: 2 }}>
            {scheduleTitle(order)}
          </div>
          <div className="center bold" style={{ fontSize: "1.05em" }}>
            {formatDate(order.deliveryDate, "dd/MM/yyyy")}
            {order.deliveryTime ? ` · ${order.deliveryTime}` : ""}
          </div>
          {event?.guestCount ? (
            <div className="center muted" style={{ fontSize: "0.9em" }}>
              {event.guestCount} ضيف/قطعة
            </div>
          ) : null}
        </>
      ) : null}

      {hasDelivery && (order.deliveryZone || order.deliveryAddress) ? (
        <>
          <div className="line" />
          <div className="muted" style={{ fontSize: "0.75em", lineHeight: 1.25 }}>
            {[order.deliveryZone, order.deliveryAddress]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </>
      ) : null}

      <div className="line" />
      {order.items.map((item) => (
        <div key={item.id} style={{ marginBottom: 4 }}>
          <div className="item-name">{item.productNameAr}</div>
          <div className="row">
            <span className="money-ar">
              {item.quantity} ×{" "}
              {formatDocMoney(item.unitPrice, settings.currencySymbol)}
            </span>
            <span className="money-ar">
              {formatDocMoney(item.total, settings.currencySymbol)}
            </span>
          </div>
        </div>
      ))}
      <div className="line" />
      <div className="row">
        <span>المجموع الفرعي</span>
        <span className="money-ar">
          {formatDocMoney(order.subtotal, settings.currencySymbol)}
        </span>
      </div>
      {order.discountAmount > 0 ? (
        <div className="row">
          <span>الخصم</span>
          <span className="money-ar">
            −{formatDocMoney(order.discountAmount, settings.currencySymbol)}
          </span>
        </div>
      ) : null}
      <div className="row">
        <span>الضريبة ({settings.taxRate}%)</span>
        <span className="money-ar">
          {formatDocMoney(order.taxAmount, settings.currencySymbol)}
        </span>
      </div>
      {order.deliveryFee > 0 || order.type === "delivery" ? (
        <div className="row">
          <span>التوصيل</span>
          <span className="money-ar">
            {order.deliveryFee > 0
              ? formatDocMoney(order.deliveryFee, settings.currencySymbol)
              : formatDocMoney(0, settings.currencySymbol)}
          </span>
        </div>
      ) : null}
      <div className="line" />
      <div className="row total">
        <span>الإجمالي</span>
        <span className="money-ar">
          {formatDocMoney(order.total, settings.currencySymbol)}
        </span>
      </div>
      {order.paidAmount > 0 ? (
        <div className="row">
          <span>المدفوع</span>
          <span className="money-ar">
            {formatDocMoney(order.paidAmount, settings.currencySymbol)}
          </span>
        </div>
      ) : null}
      {balance > 0 ? (
        <div className="row bold">
          <span>المتبقي</span>
          <span className="money-ar">
            {formatDocMoney(balance, settings.currencySymbol)}
          </span>
        </div>
      ) : null}
      {payment ? (
        <div className="row" style={{ marginTop: 3 }}>
          <span>الدفع</span>
          <span>
            {PAYMENT_LABELS[payment.method as PaymentMethod] ?? payment.method}
          </span>
        </div>
      ) : null}
      <div className="line" />
      {qrPayload ? <QRCodeSVG value={qrPayload} size={88} level="M" /> : null}
      <div className="center muted" style={{ marginTop: 6, fontSize: "0.9em" }}>
        {settings.invoiceFooter}
      </div>
    </div>
  );
});
