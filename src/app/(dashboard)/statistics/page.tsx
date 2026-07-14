"use client";

import { useCallback, useState } from "react";
import {
  BarChart3,
  Coins,
  PieChart,
  Receipt,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { MetricCard } from "@/components/shared/metric-card";
import { Skeleton } from "@/components/ui/skeleton";
import { getState } from "@/lib/data/store";
import { useStoreSubscription } from "@/hooks/use-store-subscription";
import { formatNumber } from "@/lib/utils";
import type { AppState } from "@/types";

import { SalesAreaChart } from "@/components/charts/sales-area-chart";
import { SalesBarChart } from "@/components/charts/sales-bar-chart";
import { TopProductsChart } from "@/components/charts/top-products-chart";
import { StatusDonut } from "@/components/charts/status-donut";
import { CHART_COLORS } from "@/components/charts/chart-theme";
import { StatChartCard } from "@/components/statistics/stat-chart-card";
import { TimeRangeToggle } from "@/components/statistics/time-range-toggle";
import {
  rangeDescription,
  useStatisticsData,
  type TimeRange,
} from "@/components/statistics/use-statistics-data";

const COMPARE_LABEL = "مقارنة بالفترة السابقة";

export default function StatisticsPage() {
  const [state, setState] = useState<AppState | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<TimeRange>("7d");

  const refresh = useCallback(() => {
    setState(getState());
    setLoading(false);
  }, []);

  useStoreSubscription(refresh);

  const data = useStatisticsData(state ?? getState(), range);

  if (loading || !state) {
    return <StatisticsSkeleton />;
  }

  const areaData = data.buckets.map((b) => ({ label: b.label, value: b.sales }));
  const ordersData = data.buckets.map((b) => ({
    label: b.label,
    value: b.orders,
  }));
  const topProductsData = data.topProducts.map((p) => ({
    name: p.name.length > 16 ? `${p.name.slice(0, 16)}…` : p.name,
    value: p.value,
  }));
  const statusTotal = data.statusMix.reduce((sum, s) => sum + s.value, 0);

  const isAll = range === "all";

  return (
    <div className="space-y-6 py-4">
      <PageHeader
        title="الإحصائيات"
        description="تحليلات مرئية لأداء المتجر"
        actions={<TimeRangeToggle value={range} onChange={setRange} />}
      />

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="مبيعات الفترة"
          value={<CurrencyDisplay amount={data.kpis.sales} />}
          delta={data.kpis.salesDelta ?? undefined}
          deltaLabel={isAll ? "إجمالي كل الفترات" : COMPARE_LABEL}
          sparklineData={data.salesSpark}
          icon={Coins}
          accent="gold"
        />
        <MetricCard
          label="عدد الطلبات"
          value={formatNumber(data.kpis.orders)}
          delta={data.kpis.ordersDelta ?? undefined}
          deltaLabel={isAll ? "كل الفترات" : COMPARE_LABEL}
          sparklineData={data.ordersSpark}
          icon={ShoppingBag}
          accent="caramel"
        />
        <MetricCard
          label="متوسط قيمة الطلب"
          value={<CurrencyDisplay amount={data.kpis.avgOrder} />}
          delta={data.kpis.avgOrderDelta ?? undefined}
          deltaLabel={isAll ? "كل الفترات" : COMPARE_LABEL}
          sparklineData={data.avgOrderSpark}
          icon={Receipt}
          accent="pistachio"
        />
        <MetricCard
          label="صافي الربح"
          value={<CurrencyDisplay amount={data.kpis.profit} />}
          delta={data.kpis.profitDelta ?? undefined}
          deltaLabel={isAll ? "كل الفترات" : COMPARE_LABEL}
          sparklineData={data.profitSpark}
          icon={Wallet}
          accent="cacao"
        />
      </div>

      {/* Hero area chart + status donut */}
      <div className="grid gap-4 lg:grid-cols-3">
        <StatChartCard
          title="تطور المبيعات"
          subtitle={rangeDescription(range)}
          icon={TrendingUp}
          accent={CHART_COLORS.gold}
          className="lg:col-span-2"
          empty={!data.hasSales}
          emptyTitle="لا توجد مبيعات في هذه الفترة"
          emptyDescription="جرّب نطاقاً زمنياً أوسع أو أضف طلبات مكتملة لعرض التطور"
        >
          <SalesAreaChart data={areaData} height={320} valueLabel="المبيعات" />
        </StatChartCard>

        <StatChartCard
          title="توزيع حالات الطلبات"
          subtitle="لقطة للطلبات النشطة"
          icon={PieChart}
          accent={CHART_COLORS.berry}
          empty={statusTotal === 0}
          emptyTitle="لا توجد طلبات"
          emptyDescription="ستظهر توزيع الحالات عند وجود طلبات"
        >
          <StatusDonut
            data={data.statusMix}
            height={220}
            centerValue={formatNumber(statusTotal)}
          />
        </StatChartCard>
      </div>

      {/* Top products + orders by day */}
      <div className="grid gap-4 lg:grid-cols-2">
        <StatChartCard
          title="أفضل المنتجات مبيعاً"
          subtitle={isAll ? "كل الفترات" : rangeDescription(range)}
          icon={BarChart3}
          accent={CHART_COLORS.caramel}
          empty={topProductsData.length === 0}
          emptyTitle="لا توجد منتجات مباعة"
          emptyDescription="ستظهر المنتجات الأكثر مبيعاً عند إتمام طلبات"
        >
          <TopProductsChart data={topProductsData} height={300} />
        </StatChartCard>

        <StatChartCard
          title="عدد الطلبات"
          subtitle={rangeDescription(range)}
          icon={ShoppingBag}
          accent={CHART_COLORS.pistachio}
          empty={!data.hasSales}
          emptyTitle="لا توجد طلبات في هذه الفترة"
          emptyDescription="جرّب نطاقاً زمنياً أوسع لعرض الطلبات"
        >
          <SalesBarChart
            data={ordersData}
            height={300}
            valueLabel="الطلبات"
            unit="طلب"
            color={CHART_COLORS.pistachio}
          />
        </StatChartCard>
      </div>
    </div>
  );
}

function StatisticsSkeleton() {
  return (
    <div className="space-y-6 py-4">
      <Skeleton className="h-10 w-48" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}
