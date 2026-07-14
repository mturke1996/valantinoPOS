"use client";

import { forwardRef } from "react";

import {
  DOC_FONT_STACK,
  DOC_INK,
  DOC_PAGE,
  formatDocMoney,
} from "@/components/documents/brand";
import { DocBrandHeader, DocTitleBand } from "@/components/documents/doc-chrome";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { Customer, Order, Settings } from "@/types";

interface DeliveryReceiptTemplateProps {
  order: Order;
  settings: Settings;
  customer: Customer | null;
  hidePrices?: boolean;
}

export const DeliveryReceiptTemplate = forwardRef<
  HTMLDivElement,
  DeliveryReceiptTemplateProps
>(function DeliveryReceiptTemplate(
  { order, settings, customer, hidePrices = false },
  ref,
) {
  const recipient =
    order.deliveryRecipientName ?? customer?.name ?? "مستلم";
  const phone = order.deliveryPhone ?? customer?.phone ?? "—";

  return (
    <div
      ref={ref}
      className="doc-shell overflow-hidden bg-white text-[12px]"
      style={{
        width: DOC_PAGE.width,
        minHeight: DOC_PAGE.minHeight,
        color: DOC_INK.text,
        fontFamily: DOC_FONT_STACK,
      }}
      dir="rtl"
    >
      <DocBrandHeader
        settings={settings}
        titleEn="DELIVERY"
        titleAr="واصل استلام"
        refLine={`#${order.orderNumber}`}
      />

      <div className="space-y-5 px-8 py-6">
        <DocTitleBand
          titleEn="DELIVERY"
          titleAr="إيصال تسليم"
          meta={
            <p className="tabular-nums">{formatDateTime(order.createdAt)}</p>
          }
        />

        <div
          className="grid grid-cols-2 gap-4 rounded-sm p-4"
          style={{
            background: DOC_INK.zebra,
            border: `1px solid ${DOC_INK.border}`,
          }}
        >
          <Info label="المستلم" value={recipient} />
          <Info label="الهاتف" value={phone} ltr />
          <Info
            label="موعد التسليم"
            value={[
              order.deliveryDate
                ? formatDate(order.deliveryDate, "dd MMM yyyy")
                : "—",
              order.deliveryTime,
            ]
              .filter(Boolean)
              .join(" · ")}
          />
          <Info label="المنطقة" value={order.deliveryZone ?? "—"} />
          <Info
            label="سعر التوصيل"
            value={
              order.deliveryFee > 0
                ? formatDocMoney(order.deliveryFee, settings.currencySymbol)
                : "مجاني"
            }
          />
          <div className="col-span-2">
            <Info label="مكان التوصيل" value={order.deliveryAddress ?? "—"} />
          </div>
          {order.deliveryInstructions ? (
            <div className="col-span-2">
              <Info label="تعليمات" value={order.deliveryInstructions} />
            </div>
          ) : null}
        </div>

        {!hidePrices && order.deliveryFee > 0 ? (
          <div
            className="flex items-center justify-between rounded-sm px-4 py-2.5 text-[12px]"
            style={{
              background: DOC_INK.paleGold,
              border: `1px solid ${DOC_INK.goldLine}`,
            }}
          >
            <span className="font-extrabold" style={{ color: DOC_INK.goldDeep }}>
              يتضمن سعر التوصيل
            </span>
            <span className="money-ar tabular-nums font-extrabold">
              {formatDocMoney(order.deliveryFee, settings.currencySymbol)}
            </span>
          </div>
        ) : null}

        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr
              style={{
                background: DOC_INK.paleGold,
                color: DOC_INK.goldDeep,
                borderBottom: `2px solid ${DOC_INK.gold}`,
              }}
            >
              <th className="px-3 py-3 text-start font-extrabold">الصنف</th>
              <th className="w-16 px-2 py-3 text-center font-extrabold">الكمية</th>
              {!hidePrices ? (
                <th className="w-28 px-3 py-3 text-end font-extrabold">القيمة</th>
              ) : (
                <th className="w-16 px-3 py-3 text-center font-extrabold">✓</th>
              )}
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
                <td className="px-3 py-3 font-bold">{item.productNameAr}</td>
                <td className="px-2 py-3 text-center tabular-nums font-semibold">
                  {item.quantity}
                </td>
                {!hidePrices ? (
                  <td
                    className="money-ar px-3 py-3 text-end tabular-nums font-extrabold"
                  >
                    {formatDocMoney(item.total, settings.currencySymbol)}
                  </td>
                ) : (
                  <td
                    className="px-3 py-3 text-center"
                    style={{ color: DOC_INK.faint }}
                  >
                    ☐
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {!hidePrices ? (
          <div
            className="ms-auto flex w-[48%] justify-between rounded-sm px-4 py-3 text-[14px] font-extrabold"
            style={{
              background: DOC_INK.paleGold,
              border: `1px solid ${DOC_INK.goldLine}`,
              borderTop: `2px solid ${DOC_INK.gold}`,
            }}
          >
            <span style={{ color: DOC_INK.goldDeep }}>المطلوب تحصيله</span>
            <span className="money-ar tabular-nums" style={{ color: DOC_INK.text }}>
              {formatDocMoney(
                Math.max(0, order.total - order.paidAmount),
                settings.currencySymbol,
              )}
            </span>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-10 pt-8">
          <SignatureBox label="توقيع المستلم" />
          <SignatureBox label="توقيع المندوب" />
        </div>

        <p className="pt-2 text-[10px]" style={{ color: DOC_INK.faint }}>
          وثيقة تسليم — Valentino · يُرجى التحقق من الأصناف قبل التوقيع
        </p>
      </div>
    </div>
  );
});

function Info({
  label,
  value,
  ltr,
}: {
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div>
      <p
        className="text-[10px] font-extrabold tracking-wide"
        style={{ color: DOC_INK.goldDeep }}
      >
        {label}
      </p>
      <p
        className={`mt-1 text-[13px] font-bold leading-snug ${ltr ? "num-ltr" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function SignatureBox({ label }: { label: string }) {
  return (
    <div>
      <p className="mb-10 text-[12px] font-bold" style={{ color: DOC_INK.muted }}>
        {label}
      </p>
      <div
        className="border-t pt-1.5 text-[10px]"
        style={{ borderColor: DOC_INK.goldLine, color: DOC_INK.faint }}
      >
        الاسم والتوقيع
      </div>
    </div>
  );
}
