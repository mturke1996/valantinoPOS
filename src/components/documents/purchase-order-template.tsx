"use client";

import { forwardRef } from "react";

import {
  DOC_FONT_STACK,
  DOC_INK,
  DOC_PAGE,
  PO_STATUS_LABELS,
  formatDocMoney,
} from "@/components/documents/brand";
import { DocBrandHeader, DocTitleBand } from "@/components/documents/doc-chrome";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { PurchaseOrder, Settings, Supplier } from "@/types";

interface PurchaseOrderTemplateProps {
  purchaseOrder: PurchaseOrder;
  supplier: Supplier | null;
  settings: Settings;
}

export const PurchaseOrderTemplate = forwardRef<
  HTMLDivElement,
  PurchaseOrderTemplateProps
>(function PurchaseOrderTemplate({ purchaseOrder, supplier, settings }, ref) {
  const statusLabel =
    PO_STATUS_LABELS[purchaseOrder.status] ?? purchaseOrder.status;

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
        titleEn="P.O."
        titleAr="أمر شراء"
        refLine={`#${purchaseOrder.poNumber}`}
        statusLabel={statusLabel}
        statusTone="neutral"
      />

      <div className="space-y-5 px-8 py-6">
        <DocTitleBand
          titleEn="PURCHASE ORDER"
          titleAr="طلبية رسمية"
          meta={
            <>
              <p className="tabular-nums">
                {formatDateTime(purchaseOrder.createdAt)}
              </p>
              {purchaseOrder.expectedDate ? (
                <p className="mt-1">
                  متوقع: {formatDate(purchaseOrder.expectedDate, "dd/MM/yyyy")}
                </p>
              ) : null}
            </>
          }
        />

        <div className="flex gap-6">
          <div className="w-[36%] space-y-2 text-[12px]">
            <Row label="الحالة" value={statusLabel} />
            <Row
              label="الاستلام"
              value={
                purchaseOrder.receivedAt
                  ? formatDate(purchaseOrder.receivedAt, "dd/MM/yyyy")
                  : "—"
              }
            />
          </div>
          <div
            className="min-w-0 flex-1 rounded-sm px-4 py-3"
            style={{
              borderInlineStart: `3px solid ${DOC_INK.gold}`,
              background: DOC_INK.paleGold,
            }}
          >
            <p
              className="text-[10px] font-extrabold tracking-wide"
              style={{ color: DOC_INK.goldDeep }}
            >
              المورد
            </p>
            <p className="mt-1.5 text-[15px] font-extrabold">
              {supplier?.name ?? "—"}
            </p>
            {supplier?.contactPerson ? (
              <p className="mt-1 text-[12px]" style={{ color: DOC_INK.muted }}>
                {supplier.contactPerson}
              </p>
            ) : null}
            {supplier?.phone ? (
              <p
                className="num-ltr mt-1 tabular-nums"
                style={{ color: DOC_INK.muted }}
              >
                {supplier.phone}
              </p>
            ) : null}
            {supplier?.address ? (
              <p className="mt-1.5 text-[11px]" style={{ color: DOC_INK.muted }}>
                {supplier.address}
              </p>
            ) : null}
          </div>
        </div>

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
              <th className="w-14 px-2 py-3 text-center font-extrabold">الكمية</th>
              <th className="w-14 px-2 py-3 text-center font-extrabold">المستلم</th>
              <th className="w-16 px-2 py-3 text-center font-extrabold">التكلفة</th>
              <th className="w-28 px-3 py-3 text-end font-extrabold">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {purchaseOrder.items.map((item, index) => (
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
                <td className="px-2 py-3 text-center tabular-nums">
                  {item.receivedQuantity}
                </td>
                <td className="px-2 py-3 text-center tabular-nums">
                  <span className="money-ar">
                    {formatDocMoney(item.unitCost, settings.currencySymbol)}
                  </span>
                </td>
                <td
                  className="money-ar px-3 py-3 text-end tabular-nums font-extrabold"
                >
                  {formatDocMoney(item.total, settings.currencySymbol)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div
          className="ms-auto w-[48%] overflow-hidden rounded-sm text-[12px]"
          style={{ border: `1px solid ${DOC_INK.border}` }}
        >
          <div className="space-y-1 px-4 py-3" style={{ color: DOC_INK.muted }}>
            <div className="flex justify-between">
              <span>المجموع الفرعي</span>
              <span className="money-ar tabular-nums font-semibold">
                {formatDocMoney(purchaseOrder.subtotal, settings.currencySymbol)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>الضريبة</span>
              <span className="money-ar tabular-nums font-semibold">
                {formatDocMoney(
                  purchaseOrder.taxAmount,
                  settings.currencySymbol,
                )}
              </span>
            </div>
          </div>
          <div
            className="flex justify-between px-4 py-3 text-[14px] font-extrabold"
            style={{
              background: DOC_INK.paleGold,
              borderTop: `2px solid ${DOC_INK.gold}`,
              color: DOC_INK.text,
            }}
          >
            <span style={{ color: DOC_INK.goldDeep }}>الإجمالي</span>
            <span className="money-ar tabular-nums">
              {formatDocMoney(purchaseOrder.total, settings.currencySymbol)}
            </span>
          </div>
        </div>

        {purchaseOrder.notes ? (
          <div
            className="rounded-sm px-4 py-3 text-[12px]"
            style={{
              background: DOC_INK.paleGold,
              borderInlineStart: `3px solid ${DOC_INK.gold}`,
            }}
          >
            <p className="font-extrabold" style={{ color: DOC_INK.text }}>
              ملاحظات
            </p>
            <p className="mt-1" style={{ color: DOC_INK.muted }}>
              {purchaseOrder.notes}
            </p>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-10 pt-8">
          <div>
            <p
              className="mb-10 text-[12px] font-bold"
              style={{ color: DOC_INK.muted }}
            >
              اعتماد المشتريات
            </p>
            <div
              className="border-t pt-1.5 text-[10px]"
              style={{ borderColor: DOC_INK.goldLine, color: DOC_INK.faint }}
            >
              التوقيع والختم
            </div>
          </div>
          <div>
            <p
              className="mb-10 text-[12px] font-bold"
              style={{ color: DOC_INK.muted }}
            >
              تأكيد المورد
            </p>
            <div
              className="border-t pt-1.5 text-[10px]"
              style={{ borderColor: DOC_INK.goldLine, color: DOC_INK.faint }}
            >
              التوقيع والختم
            </div>
          </div>
        </div>

        <p className="pt-2 text-[10px]" style={{ color: DOC_INK.faint }}>
          أمر شراء رسمي — Valentino · يُعتد بالنسخ المطبوعة الموثّقة فقط
        </p>
      </div>
    </div>
  );
});

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span style={{ color: DOC_INK.faint }}>{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
