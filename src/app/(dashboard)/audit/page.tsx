"use client";

import { useCallback, useMemo, useState } from "react";
import { Search, ScrollText, X } from "lucide-react";

import { AuditStats } from "@/components/audit/audit-stats";
import { AuditTimeline } from "@/components/audit/audit-timeline";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useStoreSubscription } from "@/hooks/use-store-subscription";
import {
  computeAuditStats,
  groupPresentedAuditLogs,
  presentAuditLogs,
  type PresentedAuditLog,
} from "@/lib/audit/present-audit-log";
import {
  AUDIT_CATEGORY_FILTERS,
  type AuditCategory,
} from "@/lib/constants/audit";
import { getState } from "@/lib/data/store";
import { cn } from "@/lib/utils";

export default function AuditPage() {
  const [items, setItems] = useState<PresentedAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<AuditCategory>("all");
  const [search, setSearch] = useState("");

  const refresh = useCallback(() => {
    const state = getState();
    setItems(presentAuditLogs(state.auditLogs, state));
    setLoading(false);
  }, []);

  useStoreSubscription(refresh);

  const stats = useMemo(() => computeAuditStats(items), [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (!q) return true;
      return item.searchText.includes(q);
    });
  }, [items, category, search]);

  const groups = useMemo(
    () => groupPresentedAuditLogs(filtered),
    [filtered],
  );

  if (loading) {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-28 rounded-2xl" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5 py-4">
      <PageHeader
        title="سجل النشاط"
        description="تتبع احترافي لكل العمليات الحساسة — طلبات، مدفوعات، مخزون، وموظفين"
      />

      <AuditStats
        total={stats.total}
        today={stats.today}
        orders={stats.orders}
        payments={stats.payments}
        inventory={stats.inventory}
      />

      <div className="space-y-3 rounded-2xl border border-cacao-800/8 bg-card/60 p-3 sm:p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث في الإجراءات، العملاء، الطلبات، الموظفين…"
            className="h-11 ps-10 pe-10"
            aria-label="بحث في سجل النشاط"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute end-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-cacao-800/5 hover:text-foreground"
              aria-label="مسح البحث"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {AUDIT_CATEGORY_FILTERS.map(({ key, label }) => {
            const count =
              key === "all"
                ? items.length
                : items.filter((item) => item.category === key).length;
            const active = category === key;
            return (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={active ? "default" : "outline"}
                className={cn(
                  "min-h-10 shrink-0 gap-1.5",
                  !active && "border-cacao-800/10",
                )}
                onClick={() => setCategory(key)}
              >
                {label}
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[10px] tabular-nums",
                    active
                      ? "bg-primary-foreground/15"
                      : "bg-cacao-800/8 text-muted-foreground",
                  )}
                >
                  {count.toLocaleString("ar-LY")}
                </span>
              </Button>
            );
          })}
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="لا يوجد سجل نشاط بعد"
          description="ستظهر هنا كل العمليات المهمة فور حدوثها في النظام"
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="لا نتائج مطابقة"
          description="جرّب تغيير الفلتر أو كلمات البحث"
          action={
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setCategory("all");
              }}
            >
              إعادة ضبط الفلاتر
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            عرض {filtered.length.toLocaleString("ar-LY")} من أصل{" "}
            {items.length.toLocaleString("ar-LY")} عملية
          </p>
          <AuditTimeline groups={groups} />
        </div>
      )}
    </div>
  );
}
