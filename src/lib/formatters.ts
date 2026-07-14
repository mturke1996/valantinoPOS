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
