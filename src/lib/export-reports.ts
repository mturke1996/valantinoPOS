import * as XLSX from "xlsx";

import type { AppState } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function toCsv(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n");
}

export function exportReport(
  reportId: string,
  format: "csv" | "xlsx",
  state: AppState,
): void {
  const stamp = new Date().toISOString().slice(0, 10);
  let rows: string[][] = [];
  let sheetName = reportId;

  if (reportId === "sales") {
    rows = [
      ["رقم الطلب", "النوع", "الحالة", "الإجمالي", "المدفوع", "التاريخ"],
      ...state.orders
        .filter((o) => !o.deletedAt)
        .map((o) => [
          o.orderNumber,
          o.type,
          o.status,
          String(o.total),
          String(o.paidAmount),
          formatDate(o.createdAt),
        ]),
    ];
    sheetName = "المبيعات";
  } else if (reportId === "customers") {
    rows = [
      ["الاسم", "الهاتف", "النقاط", "الإنفاق", "عدد الطلبات"],
      ...state.customers
        .filter((c) => !c.deletedAt)
        .map((c) => [
          c.name,
          c.phone,
          String(c.loyaltyPoints),
          String(c.totalSpent),
          String(c.orderCount),
        ]),
    ];
    sheetName = "العملاء";
  } else {
    const revenue = state.orders
      .filter((o) => !o.deletedAt)
      .reduce((sum, o) => sum + o.total, 0);
    const costs = state.orders
      .filter((o) => !o.deletedAt)
      .reduce((sum, o) => {
        const orderCost = o.items.reduce((itemSum, item) => {
          const product = state.products.find((p) => p.id === item.productId);
          return itemSum + (product?.costPrice ?? 0) * item.quantity;
        }, 0);
        return sum + orderCost;
      }, 0);
    rows = [
      ["البند", "القيمة"],
      ["إجمالي المبيعات", String(revenue)],
      ["تكلفة البضاعة", String(costs)],
      ["صافي الربح", String(revenue - costs)],
    ];
    sheetName = "الأرباح";
  }

  const filenameBase = `valentino-${reportId}-${stamp}`;

  if (format === "csv") {
    const csv = `\uFEFF${toCsv(rows)}`;
    downloadBlob(
      `${filenameBase}.csv`,
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    return;
  }

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filenameBase}.xlsx`);
}

export function formatReportSummary(
  reportId: string,
  state: AppState,
): string {
  if (reportId === "sales") {
    const total = state.orders
      .filter((o) => !o.deletedAt)
      .reduce((sum, o) => sum + o.total, 0);
    return formatCurrency(total);
  }
  return "";
}
