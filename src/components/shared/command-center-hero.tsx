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
import { cn, formatNumber } from "@/lib/utils";

interface CommandCenterHeroProps {
  todaySales: number;
  newOrders: number;
  todayDeliveries: number;
  urgentCount: number;
  upcomingEventsCount?: number;
  walkInSalesEnabled?: boolean;
  className?: string;
}

export function CommandCenterHero({
  todaySales,
  newOrders,
  todayDeliveries,
  urgentCount,
  upcomingEventsCount = 0,
  walkInSalesEnabled = true,
  className,
}: CommandCenterHeroProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl border border-cacao-800/10 bg-card p-5 sm:p-7",
        className,
      )}
    >
      {/* Warm chocolate atmosphere */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 100% 0%, rgba(212,175,55,0.16), transparent 55%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(196,149,106,0.14), transparent 50%), linear-gradient(135deg, rgba(61,43,31,0.04), transparent 45%)",
        }}
      />
      <div
        className="pointer-events-none absolute -end-16 -top-20 size-64 rounded-full bg-gold-400/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 -start-10 size-72 rounded-full bg-caramel-500/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-l from-transparent via-gold-400/35 to-transparent"
        aria-hidden
      />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium tracking-[0.14em] text-gold-400/90">
              فالنتينو · مركز القيادة
            </p>
            <h1 className="mt-1.5 text-balance text-2xl font-semibold tracking-tight text-cacao-950 dark:text-cream-50 sm:text-3xl">
              نبض المتجر اليوم
            </h1>
          </div>

          <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
            <CurrencyDisplay
              amount={todaySales}
              className="font-mono text-4xl font-semibold tabular-nums tracking-tight sm:text-5xl"
            />
            <div className="flex flex-wrap gap-2 pb-1.5 text-sm text-muted-foreground">
              <span className="rounded-full bg-cacao-800/[0.06] px-2.5 py-0.5 tabular-nums">
                {formatNumber(newOrders)} طلب جديد
              </span>
              {todayDeliveries > 0 ? (
                <span className="rounded-full bg-pistachio-400/15 px-2.5 py-0.5 text-cacao-800 tabular-nums dark:text-cream-100">
                  {formatNumber(todayDeliveries)} تسليم اليوم
                </span>
              ) : null}
              {upcomingEventsCount > 0 ? (
                <span className="rounded-full bg-gold-400/15 px-2.5 py-0.5 text-cacao-800 tabular-nums dark:text-cream-100">
                  {formatNumber(upcomingEventsCount)} مناسبة قادمة
                </span>
              ) : null}
            </div>
          </div>

          {urgentCount > 0 ? (
            <p className="inline-flex items-center gap-1.5 rounded-full border border-caramel-500/25 bg-caramel-500/10 px-3 py-1 text-xs text-caramel-600 dark:text-caramel-400">
              <AlertTriangle className="size-3.5" />
              {formatNumber(urgentCount)} تنبيه يحتاج متابعة فورية
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              لا تنبيهات عاجلة — اليوم يسير بهدوء
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild className="shadow-sm shadow-cacao-800/10">
            <Link href="/pos" className="gap-2">
              <ShoppingCart className="size-4" />
              {walkInSalesEnabled ? "نقطة البيع" : "طلب تجهيز جديد"}
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-gold-400/30 bg-gold-400/5 hover:bg-gold-400/10">
            <Link href="/events" className="gap-2">
              <PartyPopper className="size-4 text-gold-400" />
              مناسبة جديدة
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/calendar" className="gap-2">
              <CalendarDays className="size-4" />
              التقويم الكامل
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
