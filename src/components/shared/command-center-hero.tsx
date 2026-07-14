"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  PartyPopper,
  ShoppingCart,
} from "lucide-react";

import { CurrencyDisplay } from "@/components/shared/currency-display";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";

interface CommandCenterHeroProps {
  todaySales: number;
  newOrders: number;
  todayDeliveries: number;
  urgentCount: number;
  walkInSalesEnabled?: boolean;
}

export function CommandCenterHero({
  todaySales,
  newOrders,
  todayDeliveries,
  urgentCount,
  walkInSalesEnabled = true,
}: CommandCenterHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-cacao-800/10 bg-card p-5 sm:p-6">
      <div
        className="pointer-events-none absolute inset-y-0 end-0 hidden w-32 grid-cols-2 gap-1.5 bg-cream-100/40 p-5 opacity-60 lg:grid dark:bg-cacao-800/10"
        aria-hidden
      >
        {Array.from({ length: 8 }).map((_, index) => (
          <span
            key={index}
            className="rounded-md border border-cacao-800/8 bg-cacao-800/[0.04] shadow-inner"
          />
        ))}
      </div>

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:pe-36">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground">
              مركز القيادة · اليوم
            </p>
            <h1 className="mt-1 text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
              نبض المتجر
            </h1>
          </div>
          <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
            <CurrencyDisplay
              amount={todaySales}
              className="font-mono text-4xl font-semibold tabular-nums tracking-tight sm:text-5xl"
            />
            <span className="pb-1 text-sm text-muted-foreground">
              {formatNumber(newOrders)} طلب جديد
              {todayDeliveries > 0
                ? ` · ${formatNumber(todayDeliveries)} تسليم اليوم`
                : ""}
            </span>
          </div>
          {urgentCount > 0 ? (
            <p className="inline-flex items-center gap-1.5 rounded-md bg-caramel-500/10 px-2 py-1 text-xs text-caramel-500">
              <AlertTriangle className="size-3.5" />
              {formatNumber(urgentCount)} تنبيه يحتاج متابعة
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/pos" className="gap-2">
              <ShoppingCart className="size-4" />
              {walkInSalesEnabled ? "نقطة البيع" : "طلب تجهيز جديد"}
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
          >
            <Link href="/events" className="gap-2">
              <PartyPopper className="size-4" />
              مناسبة جديدة
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
          >
            <Link href="/calendar" className="gap-2">
              <CalendarDays className="size-4" />
              التقويم
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
