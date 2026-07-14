"use client";

import { forwardRef } from "react";

import {
  DOC_FONT_STACK,
  DOC_INK,
  DOC_PAGE,
  formatDocMoney,
} from "@/components/documents/brand";
import { DocBrandHeader, DocTitleBand } from "@/components/documents/doc-chrome";
import { formatDateTime } from "@/lib/utils";
import type { Settings, Shift } from "@/types";

export interface ZReportStats {
  orders: number;
  cashSales: number;
  cardSales: number;
  transferSales: number;
  totalSales: number;
}

interface ZReportTemplateProps {
  shift: Shift;
  report: ZReportStats;
  settings: Settings;
  cashierName?: string;
}

export const ZReportTemplate = forwardRef<HTMLDivElement, ZReportTemplateProps>(
  function ZReportTemplate({ shift, report, settings, cashierName }, ref) {
    const rows: Array<{ label: string; value: string; emphasize?: boolean }> = [
      { label: "الكاشير", value: cashierName ?? "—" },
      { label: "فتح الوردية", value: formatDateTime(shift.openedAt) },
      {
        label: "إغلاق الوردية",
        value: shift.closedAt ? formatDateTime(shift.closedAt) : "مفتوحة",
      },
      {
        label: "رصيد افتتاحي",
        value: formatDocMoney(shift.openingFloat, settings.currencySymbol),
      },
      {
        label: "المتوقع نقداً",
        value: formatDocMoney(shift.expectedCash, settings.currencySymbol),
      },
      {
        label: "العد الفعلي",
        value:
          shift.closingCount != null
            ? formatDocMoney(shift.closingCount, settings.currencySymbol)
            : "—",
      },
      {
        label: "الفرق",
        value:
          shift.variance != null
            ? formatDocMoney(shift.variance, settings.currencySymbol)
            : "—",
        emphasize: true,
      },
      { label: "عدد الطلبات", value: String(report.orders) },
      {
        label: "مبيعات نقدية",
        value: formatDocMoney(report.cashSales, settings.currencySymbol),
      },
      {
        label: "مبيعات بطاقة",
        value: formatDocMoney(report.cardSales, settings.currencySymbol),
      },
      {
        label: "مبيعات تحويل",
        value: formatDocMoney(report.transferSales, settings.currencySymbol),
      },
      {
        label: "إجمالي التحصيل",
        value: formatDocMoney(report.totalSales, settings.currencySymbol),
        emphasize: true,
      },
    ];

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
          titleEn="Z-REPORT"
          titleAr="تقرير الإغلاق"
          refLine={shift.id.slice(0, 8).toUpperCase()}
          statusLabel={shift.status === "closed" ? "مغلقة" : "مفتوحة"}
          statusTone={shift.status === "closed" ? "success" : "warning"}
        />

        <div className="space-y-5 px-8 py-6">
          <DocTitleBand
            titleEn="Z-REPORT"
            titleAr="تقرير إغلاق الوردية"
            meta={
              <div className="space-y-0.5">
                <p className="font-bold">{settings.branchName}</p>
                <p className="tabular-nums">{formatDateTime(shift.openedAt)}</p>
              </div>
            }
          />

          <div
            className="overflow-hidden rounded-sm"
            style={{ border: `1px solid ${DOC_INK.border}` }}
          >
            <table className="w-full border-collapse text-[12px]">
              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={row.label}
                    style={{
                      background:
                        row.emphasize
                          ? DOC_INK.paleGold
                          : index % 2 === 1
                            ? DOC_INK.zebra
                            : DOC_INK.white,
                      borderBottom: `1px solid ${DOC_INK.border}`,
                    }}
                  >
                    <td
                      className="px-4 py-3 font-bold"
                      style={{
                        color: row.emphasize ? DOC_INK.goldDeep : DOC_INK.muted,
                      }}
                    >
                      {row.label}
                    </td>
                    <td
                      className={`px-4 py-3 text-end tabular-nums font-extrabold ${
                        row.label.includes("مبيعات") ||
                        row.label.includes("إجمالي") ||
                        row.label.includes("نقد") ||
                        row.label.includes("رصيد") ||
                        row.label.includes("الفرق") ||
                        row.label.includes("العد")
                          ? "money-ar"
                          : ""
                      }`}
                      style={{ color: DOC_INK.text }}
                    >
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            className="flex items-center justify-between rounded-sm px-4 py-3 text-[14px] font-extrabold"
            style={{
              background: DOC_INK.paleGold,
              border: `1px solid ${DOC_INK.goldLine}`,
              borderTop: `2px solid ${DOC_INK.gold}`,
            }}
          >
            <span style={{ color: DOC_INK.goldDeep }}>صافي التحصيل</span>
            <span className="money-ar tabular-nums" style={{ color: DOC_INK.text }}>
              {formatDocMoney(report.totalSales, settings.currencySymbol)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-10 pt-8">
            <SignatureBox label="توقيع الكاشير" />
            <SignatureBox label="توقيع المدير" />
          </div>

          <p className="pt-2 text-[10px]" style={{ color: DOC_INK.faint }}>
            تقرير Z — Valentino POS · وثيقة داخلية لإغلاق الوردية
          </p>
        </div>
      </div>
    );
  },
);

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
