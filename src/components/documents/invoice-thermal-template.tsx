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
    title = "فاتورة ضريبية مبسطة",
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
      <div className="center bold" style={{ fontSize: "1.15em", marginBottom: 2 }}>
        {settings.branchName}
      </div>
      <div className="center muted" style={{ marginBottom: 4, fontSize: "0.9em" }}>
        {settings.branchPhone}
      </div>
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
      <div className="row">
        <span>النوع</span>
        <span className="bold">{orderTypeLabel(order, event)}</span>
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

      {hasDelivery ? (
        <>
          <div className="line" />
          <div className="center bold" style={{ marginBottom: 3 }}>
            تفاصيل التوصيل
          </div>
          {order.deliveryRecipientName ? (
            <div className="row">
              <span>المستلم</span>
              <span>{order.deliveryRecipientName}</span>
            </div>
          ) : null}
          {order.deliveryPhone ? (
            <div className="row">
              <span>الهاتف</span>
              <span className="num-ltr tabular">{order.deliveryPhone}</span>
            </div>
          ) : null}
          {order.deliveryZone ? (
            <div className="row">
              <span>المنطقة</span>
              <span>{order.deliveryZone}</span>
            </div>
          ) : null}
          {order.deliveryAddress ? (
            <div style={{ marginBottom: 3 }}>
              <div className="muted" style={{ fontSize: "0.85em" }}>
                مكان التوصيل
              </div>
              <div className="bold">{order.deliveryAddress}</div>
            </div>
          ) : null}
          {order.deliveryInstructions ? (
            <div style={{ marginBottom: 3 }}>
              <div className="muted" style={{ fontSize: "0.85em" }}>
                تعليمات
              </div>
              <div>{order.deliveryInstructions}</div>
            </div>
          ) : null}
          <div className="row bold">
            <span>سعر التوصيل</span>
            <span className="money-ar">
              {order.deliveryFee > 0
                ? formatDocMoney(order.deliveryFee, settings.currencySymbol)
                : "مجاني"}
            </span>
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
