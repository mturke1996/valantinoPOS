/**
 * Arabic helpers for @react-pdf/renderer + Tajawal.
 * Logical Unicode only — no Presentation Forms (U+FE70+).
 */

import { format as formatDateFns } from "date-fns";
import { ar as arLocale } from "date-fns/locale";

/** Pass-through logical Unicode for Tajawal shaping. */
export function ar(text: string | number | null | undefined): string {
  if (text == null) return "";
  return String(text);
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

/** Matches formatDocMoney: «1,234.00 د.ل» */
export function arMoney(
  amount: number,
  currency = "د.ل",
  decimals = 2,
): string {
  const sign = amount < 0 ? "-" : "";
  return `${sign}${groupNumber(amount, decimals)}\u00A0${currency}`;
}

export function arDate(d: string | Date): string {
  const dt = parseDocDate(d);
  if (!dt) return "—";
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
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
  return `${date} ${hh}:${mm}`;
}
