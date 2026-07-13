"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock, Wifi, WifiOff } from "lucide-react";

import { CurrencyDisplay } from "@/components/shared/currency-display";
import { OfflineIndicator } from "@/components/shared/offline-indicator";
import { ShiftPanel } from "@/components/pos/shift-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";
import type { Shift } from "@/types";

interface PosChromeProps {
  online: boolean;
  shift: Shift | null;
  sessionCount: number;
  sessionTotal: number;
  lastSaleAt: string | null;
  heldCount: number;
  operationCount: number;
  onHeldOpen: () => void;
  onOperationsOpen: () => void;
  onSalesActivityOpen: () => void;
  onShiftChange: (shift: Shift | null) => void;
}

export function PosChrome({
  online,
  shift,
  sessionCount,
  sessionTotal,
  lastSaleAt,
  heldCount,
  operationCount,
  onHeldOpen,
  onOperationsOpen,
  onSalesActivityOpen,
  onShiftChange,
}: PosChromeProps) {
  return (
    <header className="pos-chrome flex shrink-0 items-center gap-3 border-b border-cacao-800/10 bg-card/90 px-3 py-2 backdrop-blur-sm sm:px-4">
      <Button
        variant="ghost"
        size="sm"
        className="shrink-0 gap-1.5"
        asChild
      >
        <Link href="/dashboard" aria-label="العودة إلى لوحة التحكم">
          <ArrowRight className="size-4" />
          <span className="hidden sm:inline">لوحة التحكم</span>
        </Link>
      </Button>

      <div className="hidden h-6 w-px bg-cacao-800/10 sm:block" />

      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
        <button
          type="button"
          className="pos-kpi-pill shrink-0 text-start transition-colors hover:border-gold-400/30 hover:bg-gold-400/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onSalesActivityOpen}
          aria-label="فتح نشاط البيع والتحصيل"
        >
          <span className="text-[11px] text-muted-foreground">مبيعات الجلسة</span>
          <CurrencyDisplay amount={sessionTotal} className="text-sm font-semibold" />
        </button>
        <div className="pos-kpi-pill shrink-0">
          <span className="text-[11px] text-muted-foreground">عمليات</span>
          <span className="font-mono text-sm font-semibold tabular-nums">
            {formatNumber(sessionCount)}
          </span>
        </div>
        {lastSaleAt ? (
          <div className="pos-kpi-pill hidden shrink-0 md:flex">
            <span className="text-[11px] text-muted-foreground">آخر بيع</span>
            <span className="font-mono text-sm tabular-nums">{lastSaleAt}</span>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={onOperationsOpen}
        >
          <CalendarClock className="size-3.5" />
          <span className="hidden lg:inline">جدول اليوم</span>
          {operationCount > 0 ? (
            <span className="font-mono tabular-nums">{operationCount}</span>
          ) : null}
        </Button>

        <Badge
          variant="outline"
          className={
            online
              ? "border-pistachio-400/30 bg-pistachio-400/10 text-cacao-800"
              : "border-caramel-500/30 bg-caramel-500/10 text-caramel-500"
          }
        >
          {online ? (
            <Wifi className="size-3" />
          ) : (
            <WifiOff className="size-3" />
          )}
          {online ? "متصل" : "غير متصل"}
        </Badge>

        <OfflineIndicator />

        {heldCount > 0 ? (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onHeldOpen}>
            معلّقة ({heldCount})
          </Button>
        ) : null}

        <ShiftPanel onShiftChange={onShiftChange} compact shift={shift} />
      </div>
    </header>
  );
}
