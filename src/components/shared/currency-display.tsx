"use client";

import { cn } from "@/lib/utils";
import { formatCurrencyAmount } from "@/lib/formatters";
import { useSettings } from "@/hooks/use-settings";

export interface CurrencyDisplayProps {
  amount: number;
  currency?: string;
  locale?: string;
  className?: string;
  showSymbol?: boolean;
}

/**
 * مبلغ مالي: «الرقم ثم د.ل» كنص عادي — مطابق rkeaz CurrencyAmount
 * (بدون dir/ltr حتى لا تنكسر العربية في صفحة RTL).
 */
export function CurrencyDisplay({
  amount,
  currency,
  locale,
  className,
  showSymbol = true,
}: CurrencyDisplayProps) {
  const settings = useSettings();
  const formatted = formatCurrencyAmount(
    amount,
    {
      currency: currency ?? settings.currency,
      currencySymbol: settings.currencySymbol,
      locale: locale ?? settings.locale,
      country: settings.country,
    },
    showSymbol,
  );

  return (
    <span className={cn("money-ar tabular-nums tracking-tight", className)}>
      {formatted}
    </span>
  );
}
