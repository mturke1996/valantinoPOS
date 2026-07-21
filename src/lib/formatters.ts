import {
  CURRENCY_FORMAT_OPTIONS,
  LIBYA_LOCALE,
  NUMBER_FORMAT_OPTIONS,
} from "@/lib/constants/locale";
import type { Settings } from "@/types";

export type FormatSettings = Pick<
  Settings,
  "currency" | "currencySymbol" | "locale" | "country"
>;

export function getDefaultFormatSettings(): FormatSettings {
  return {
    country: LIBYA_LOCALE.country,
    currency: LIBYA_LOCALE.currency,
    currencySymbol: LIBYA_LOCALE.currencySymbol,
    locale: LIBYA_LOCALE.locale,
  };
}

export function resolveFormatSettings(
  settings?: Partial<FormatSettings> | null,
): FormatSettings {
  const defaults = getDefaultFormatSettings();
  if (!settings) return defaults;
  return {
    country: settings.country ?? defaults.country,
    currency: settings.currency ?? defaults.currency,
    currencySymbol: settings.currencySymbol ?? defaults.currencySymbol,
    locale: settings.locale ?? defaults.locale,
  };
}

/**
 * مبلغ مالي — «الرقم ثم د.ل» كنص عادي بدون رموز اتجاه (bidi).
 * مطابق rkeaz-group / formatCurrencyDisplay — يتبع RTL الصفحة فيظهر الرمز يساراً بصرياً.
 */
export function formatCurrencyAmount(
  amount: number,
  settings?: Partial<FormatSettings> | null,
  showSymbol = true,
): string {
  const resolved = resolveFormatSettings(settings);
  const sign = amount < 0 ? "-" : "";
  const absolute = Math.abs(Number.isFinite(amount) ? amount : 0);
  try {
    const value = new Intl.NumberFormat("en-US", {
      ...CURRENCY_FORMAT_OPTIONS,
      style: "decimal",
    }).format(absolute);
    if (!showSymbol) return `${sign}${value}`;
    return `${sign}${value}\u00A0${resolved.currencySymbol}`;
  } catch {
    const value = absolute.toFixed(2);
    return showSymbol
      ? `${sign}${value}\u00A0${resolved.currencySymbol}`
      : `${sign}${value}`;
  }
}

export function formatNumberAmount(
  value: number,
  settings?: Partial<FormatSettings> | null,
  options?: Intl.NumberFormatOptions,
): string {
  const resolved = resolveFormatSettings(settings);
  return new Intl.NumberFormat(resolved.locale, {
    ...NUMBER_FORMAT_OPTIONS,
    ...options,
  }).format(value);
}

export function formatMoneyLabel(
  amount: number,
  settings?: Partial<FormatSettings> | null,
): string {
  return formatCurrencyAmount(amount, settings, true);
}

/**
 * Parse user-entered amounts that may include thousand/decimal separators.
 * Supports 1,234.56 · 1.234,56 · 1.234 · 12,5 · spaces · Arabic-Indic digits.
 */
export function parseLocalizedNumber(input: string): number | null {
  let s = input.trim();
  if (!s) return null;

  s = s.replace(/[\u0660-\u0669]/g, (ch) =>
    String(ch.charCodeAt(0) - 0x0660),
  );
  s = s.replace(/[\u066B]/g, ".").replace(/[\u066C]/g, "");
  s = s.replace(/[\s\u00A0']/g, "");

  const negative = s.startsWith("-");
  if (negative) s = s.slice(1);
  if (!s) return null;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");

  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSep = lastComma > lastDot ? "," : ".";
    const thousandSep = decimalSep === "," ? "." : ",";
    s = s.split(thousandSep).join("");
    s = s.replace(decimalSep, ".");
  } else if (lastComma >= 0) {
    const after = s.slice(lastComma + 1);
    if (/^\d{1,2}$/.test(after)) {
      s = `${s.slice(0, lastComma).replace(/,/g, "")}.${after}`;
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (lastDot >= 0) {
    const after = s.slice(lastDot + 1);
    if (/^\d{1,2}$/.test(after)) {
      s = `${s.slice(0, lastDot).replace(/\./g, "")}.${after}`;
    } else {
      s = s.replace(/\./g, "");
    }
  }

  const parsed = Number.parseFloat(s);
  if (!Number.isFinite(parsed)) return null;
  return negative ? -parsed : parsed;
}
