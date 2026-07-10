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
    <span
      className={cn("font-mono tabular-nums tracking-tight", className)}
      dir="ltr"
    >
      {formatted}
    </span>
  );
}
