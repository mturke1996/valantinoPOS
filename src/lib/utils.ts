import { clsx, type ClassValue } from "clsx";
import { format as formatDateFns, parseISO } from "date-fns";
import { ar } from "date-fns/locale";
import { twMerge } from "tailwind-merge";

import { LIBYA_LOCALE, NUMBER_FORMAT_OPTIONS } from "@/lib/constants/locale";
import {
  formatCurrencyAmount,
  formatNumberAmount,
  getDefaultFormatSettings,
} from "@/lib/formatters";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function formatCurrency(
  amount: number,
  currency = LIBYA_LOCALE.currency,
  locale = LIBYA_LOCALE.locale,
): string {
  return formatCurrencyAmount(amount, { currency, locale });
}

export function formatNumber(
  value: number,
  locale = LIBYA_LOCALE.locale,
  options?: Intl.NumberFormatOptions,
): string {
  return formatNumberAmount(value, { locale }, {
    ...NUMBER_FORMAT_OPTIONS,
    ...options,
  });
}

export function formatDate(
  date: string | Date,
  pattern = "dd MMM yyyy",
  locale = ar,
): string {
  const parsed = typeof date === "string" ? parseISO(date) : date;
  return formatDateFns(parsed, pattern, { locale });
}

export function formatDateTime(
  date: string | Date,
  pattern = "dd MMM yyyy HH:mm",
  locale = ar,
): string {
  const parsed = typeof date === "string" ? parseISO(date) : date;
  return formatDateFns(parsed, pattern, { locale });
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export { getDefaultFormatSettings };
