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

export function formatCurrencyAmount(
  amount: number,
  settings?: Partial<FormatSettings> | null,
  showSymbol = true,
): string {
  const resolved = resolveFormatSettings(settings);
  try {
    return new Intl.NumberFormat(resolved.locale, {
      ...CURRENCY_FORMAT_OPTIONS,
      style: showSymbol ? "currency" : "decimal",
      currency: resolved.currency,
    }).format(amount);
  } catch {
    const value = amount.toFixed(2);
    return showSymbol ? `${value} ${resolved.currencySymbol}` : value;
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
  const resolved = resolveFormatSettings(settings);
  return `${amount.toFixed(2)} ${resolved.currencySymbol}`;
}
