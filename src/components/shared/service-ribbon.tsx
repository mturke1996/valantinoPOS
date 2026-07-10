"use client";

import Link from "next/link";
import {
  CalendarClock,
  Gift,
  MapPin,
  PartyPopper,
  Wallet,
} from "lucide-react";

import { CurrencyDisplay } from "@/components/shared/currency-display";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { ServiceRibbonItem } from "@/lib/services/operations.service";
import { cn } from "@/lib/utils";

const KIND_META = {
  delivery: { icon: MapPin, label: "توصيل", className: "bg-pistachio-400/15 text-cacao-800" },
  event: { icon: PartyPopper, label: "مناسبة", className: "bg-gold-400/15 text-cacao-800" },
  reservation: { icon: CalendarClock, label: "حجز", className: "bg-berry-500/10 text-cacao-800" },
  deposit: { icon: Wallet, label: "عربون", className: "bg-caramel-500/15 text-cacao-800" },
  pickup: { icon: Gift, label: "استلام", className: "bg-cream-100 text-cacao-800 dark:bg-cacao-800/30" },
} as const;

interface ServiceRibbonProps {
  items: ServiceRibbonItem[];
  title?: string;
  emptyLabel?: string;
  className?: string;
}

export function ServiceRibbon({
  items,
  title = "جدول اليوم",
  emptyLabel = "لا توجد تسليمات أو مناسبات اليوم",
  className,
}: ServiceRibbonProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-cacao-800/8 bg-card/80",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-cacao-800/8 px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="size-4 text-gold-400" />
          <h2 className="text-sm font-semibold">{title}</h2>
          <Badge variant="secondary" className="tabular-nums">
            {items.length}
          </Badge>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/calendar">التقويم</Link>
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-3 p-4">
            {items.map((item) => {
              const meta = KIND_META[item.kind];
              const Icon = meta.icon;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    "group inline-flex min-w-[260px] max-w-[300px] flex-col gap-2 rounded-lg border border-cacao-800/10 bg-background p-3 transition-colors",
                    "hover:border-gold-400/30 hover:bg-cream-50/50 dark:hover:bg-cacao-800/20",
                    item.urgent && "border-caramel-500/40 bg-caramel-500/5",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex size-7 items-center justify-center rounded-md",
                          meta.className,
                        )}
                      >
                        <Icon className="size-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {item.time ?? "—"} · {meta.label}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={item.status} type="order" />
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {item.subtitle}
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <CurrencyDisplay amount={item.amount} className="text-xs font-semibold" />
                    {item.paidAmount < item.amount ? (
                      <span className="text-[11px] text-caramel-500">
                        مدفوع{" "}
                        <CurrencyDisplay
                          amount={item.paidAmount}
                          className="inline text-[11px]"
                        />
                      </span>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </section>
  );
}
