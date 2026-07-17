import {
  Activity,
  CreditCard,
  Package,
  ShoppingBag,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface AuditStatsProps {
  total: number;
  today: number;
  orders: number;
  payments: number;
  inventory: number;
}

const CARDS = [
  {
    key: "today",
    label: "اليوم",
    icon: Activity,
    tone: "bg-gold-400/10 text-gold-400 border-gold-400/25",
  },
  {
    key: "orders",
    label: "طلبات",
    icon: ShoppingBag,
    tone: "bg-caramel-500/10 text-caramel-500 border-caramel-500/25",
  },
  {
    key: "payments",
    label: "مدفوعات",
    icon: CreditCard,
    tone: "bg-pistachio-400/10 text-pistachio-400 border-pistachio-400/25",
  },
  {
    key: "inventory",
    label: "مخزون",
    icon: Package,
    tone: "bg-cacao-800/8 text-cacao-800 border-cacao-800/15",
  },
] as const;

export function AuditStats({
  total,
  today,
  orders,
  payments,
  inventory,
}: AuditStatsProps) {
  const values = { today, orders, payments, inventory };

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl border border-cacao-800/[0.07] bg-gradient-to-br from-white via-cream-50/80 to-gold-400/[0.06] p-4 sm:p-5">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-l from-transparent via-gold-400/70 to-transparent"
        />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.14em] text-gold-400/90 uppercase">
              Activity Ledger
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-cacao-800">
              {total.toLocaleString("ar-LY")} عملية
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              سجل كامل لكل التغييرات الحساسة في النظام
            </p>
          </div>
          <div className="rounded-xl border border-cacao-800/10 bg-white/70 px-3 py-2 text-center">
            <p className="text-xs text-muted-foreground">اليوم</p>
            <p className="text-lg font-semibold tabular-nums text-cacao-800">
              {today.toLocaleString("ar-LY")}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {CARDS.map(({ key, label, icon: Icon, tone }) => (
          <div
            key={key}
            className={cn(
              "rounded-xl border px-3 py-3 transition-colors",
              tone,
            )}
          >
            <div className="flex items-center gap-2">
              <Icon className="size-4 shrink-0 opacity-80" />
              <span className="text-xs font-medium opacity-80">{label}</span>
            </div>
            <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-cacao-800">
              {values[key].toLocaleString("ar-LY")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
