/**
 * Arabic helpers for @react-pdf/renderer + Tajawal.
 *
 * Rules (rkeaz-group + react-pdf RTL practice):
 * - Logical Unicode only — never Presentation Forms (U+FE70+).
 * - Tajawal shapes Arabic; do not reverse strings manually.
 * - Isolate LTR runs (phones, SKUs, amounts) with BiDi marks.
 * - Tables: use PdfTable (row + visual reverse) — not CSS `direction`.
 */

import { format as formatDateFns } from "date-fns";
import { ar as arLocale } from "date-fns/locale";

/** RIGHT-TO-LEFT MARK — keep surrounding Arabic flow RTL. */
export const RTL_MARK = "\u200F";
/** LEFT-TO-RIGHT MARK — isolate numbers / Latin / phones. */
export const LTR_MARK = "\u200E";

const HAS_ARABIC = /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const LTR_RUN = /[A-Za-z0-9][A-Za-z0-9._\-+/#%]*/g;

/** Pass-through logical Unicode for Tajawal shaping. */
export function ar(text: string | number | null | undefined): string {
  if (text == null) return "";
  return String(text);
}

/**
 * Isolate LTR tokens inside Arabic text so mixed cells
 * (e.g. «صنف VAL-123») keep correct reading order.
 */
export function arMixed(text: string | number | null | undefined): string {
  if (text == null) return "";
  const str = String(text);
  if (!str) return "";
  if (!HAS_ARABIC.test(str)) return ltr(str);
  return str.replace(LTR_RUN, (run) => `${LTR_MARK}${run}${LTR_MARK}`);
}

/** Force a value to render LTR (phones, order numbers, SKUs). */
export function ltr(text: string | number | null | undefined): string {
  if (text == null) return "";
  const str = String(text);
  if (!str) return "";
  return `${LTR_MARK}${str}${LTR_MARK}`;
}

/**
 * Pick the right display helper for a cell value.
 * Pure Arabic → ar; mixed → arMixed; Latin/digits → ltr.
 */
export function pdfDisplayValue(
  text: string | number | null | undefined,
): string {
  if (text == null) return "";
  const str = String(text);
  if (!str) return "";
  if (!HAS_ARABIC.test(str)) return ltr(str);
  if (/[0-9A-Za-z]/.test(str)) return arMixed(str);
  return ar(str);
}

function groupNumber(n: number, decimals = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number.isFinite(n) ? Math.abs(n) : 0);
}

function parseDocDate(d: string | Date): Date | null {
  try {
    const dt =
      typeof d === "string"
        ? new Date(d.includes("T") ? d : `${d.slice(0, 10)}T12:00:00`)
        : d;
    if (Number.isNaN(dt.getTime())) return null;
    return dt;
  } catch {
    return null;
  }
}

/** Matches formatDocMoney: «1,234.00 د.ل» (amount LTR, currency after). */
export function arMoney(
  amount: number,
  currency = "د.ل",
  decimals = 2,
): string {
  const sign = amount < 0 ? "-" : "";
  return ltr(`${sign}${groupNumber(amount, decimals)}\u00A0${currency}`);
}

/** Compact LTR money used inside table footers when a single string is needed. */
export function ltrAmountCurrency(
  amount: number,
  currency = "د.ل",
  decimals = 2,
): string {
  const sign = Math.round(amount * 10 ** decimals) < 0 ? "-" : "";
  const curr = String(currency ?? "").trim();
  return ltr(`${sign}${curr}\u00A0${groupNumber(amount, decimals)}`);
}

export function arDate(d: string | Date): string {
  const dt = parseDocDate(d);
  if (!dt) return "—";
  return ltr(
    `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`,
  );
}

/** Matches HTML DocScheduleBlock long date: «EEEE، d MMMM yyyy» */
export function arDateLong(d: string | Date): string {
  const dt = parseDocDate(d);
  if (!dt) return "—";
  try {
    return formatDateFns(dt, "EEEE، d MMMM yyyy", { locale: arLocale });
  } catch {
    return arDate(dt);
  }
}

export function arDateTime(d: string | Date): string {
  const dt = parseDocDate(d);
  if (!dt) return "—";
  const date = arDate(dt);
  const hh = String(dt.getHours()).padStart(2, "0");
  const mm = String(dt.getMinutes()).padStart(2, "0");
  return `${date} ${ltr(`${hh}:${mm}`)}`;
}

export function hasArabic(text: string | null | undefined): boolean {
  if (!text) return false;
  return HAS_ARABIC.test(text);
}
