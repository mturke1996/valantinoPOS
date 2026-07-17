"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Package,
  PieChart,
  ShoppingBag,
  TrendingUp,
  Users,
} from "lucide-react";

import { DashboardCalendarPanel } from "@/components/dashboard/dashboard-calendar-panel";
import { UpcomingEventsPanel } from "@/components/dashboard/upcoming-events-panel";
import { SalesAreaChart } from "@/components/charts/sales-area-chart";
import { StatusDonut } from "@/components/charts/status-donut";
import { TopProductsChart } from "@/components/charts/top-products-chart";
import {
  CHART_COLORS,
  STATUS_COLOR_HEX,
} from "@/components/charts/chart-theme";
import { CommandCenterHero } from "@/components/shared/command-center-hero";
import { MetricCard } from "@/components/shared/metric-card";
import { ServiceRibbon } from "@/components/shared/service-ribbon";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { StatChartCard } from "@/components/statistics/stat-chart-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getOrders, getState } from "@/lib/data/store";
import { useStoreSubscription } from "@/hooks/use-store-subscription";
import { getUpcomingEvents } from "@/lib/reminders/event-reminders";
import { getDashboardStats } from "@/lib/services/dashboard.service";
import {
  getTodayOperations,
  getUpcomingPreparation,
} from "@/lib/services/operations.service";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import type { DashboardStats } from "@/types";
import { ORDER_STATUSES } from "@/lib/constants/order-status";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [orders, setOrders] = useState(() => getOrders());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setStats(getDashboardStats(getState()));
    setOrders(getOrders());
    setLoading(false);
  }, []);

  useStoreSubscription(refresh);

  const todayOperations = useMemo(() => {
    if (!stats) return [];
    return getTodayOperations(getState());
  }, [stats]);

  const upcomingPreparation = useMemo(() => {
    if (!stats) return [];
    return getUpcomingPreparation(getState(), 7);
  }, [stats]);

  const upcomingEvents = useMemo(() => {
    if (!stats) return [];
    return getUpcomingEvents(getState(), 7);
  }, [stats]);

  const areaData = useMemo(() => {
    if (!stats) return [];
    return stats.salesByDay.map((d) => ({
      label: d.label,
      value: d.sales,
    }));
  }, [stats]);

  const statusMix = useMemo(() => {
    if (!stats) return [];
    return ORDER_STATUSES.filter((s) => s.index >= 0).map((s) => ({
      label: s.labelAr,
      value: stats.ordersByStatus[s.key] ?? 0,
      color: STATUS_COLOR_HEX[s.color] ?? CHART_COLORS.cacao800,
    }));
  }, [stats]);

  const topProductsData = useMemo(() => {
    if (!stats) return [];
    return stats.topProducts.map((p) => ({
      name: p.nameAr,
      value: p.revenue,
    }));
  }, [stats]);

  const statusTotal = useMemo(
    () => statusMix.reduce((sum, s) => sum + s.value, 0),
    [statusMix],
  );

  if (loading) {
    return (
      <div className="space-y-6 py-4">
        <Skeleton className="h-40 w-full rounded-3xl" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <EmptyState
        icon={Package}
        title="لا توجد بيانات"
        description="ابدأ بإضافة طلبات ومنتجات لعرض الإحصائيات"
      />
    );
  }

  return (
    <div className="relative space-y-6 py-4">
      <div
        className="pointer-events-none absolute inset-x-0 -top-6 -z-10 h-72 bg-[radial-gradient(ellipse_at_top,_rgba(212,175,55,0.09),_transparent_60%)]"
        aria-hidden
      />

      <CommandCenterHero
        todaySales={stats.todaySales}
        newOrders={stats.newOrders}
        todayDeliveries={todayOperations.length}
        urgentCount={stats.urgentAlerts.length}
        upcomingEventsCount={upcomingEvents.length}
        walkInSalesEnabled={getState().settings.walkInSalesEnabled}
      />

      {stats.urgentAlerts.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {stats.urgentAlerts.map((alert) => (
            <Badge
              key={alert}
              variant="outline"
              className="gap-1.5 border-caramel-500/30 bg-caramel-500/10 text-cacao-800"
            >
              <AlertTriangle className="size-3.5 text-caramel-500" />
              {alert}
            </Badge>
          ))}
        </div>
      ) : null}

      {/* Events + Calendar — primary operational focus */}
      <div className="grid gap-4 xl:grid-cols-2">
        <UpcomingEventsPanel items={upcomingEvents} />
        <DashboardCalendarPanel orders={orders} />
      </div>

      <ServiceRibbon items={todayOperations} />
      <ServiceRibbon
        items={upcomingPreparation}
        title="طلبات تحتاج تجهيز خلال 7 أيام"
        emptyLabel="لا توجد طلبات تجهيز قريبة — الجدول هادئ"
        className="border-gold-400/20 bg-gold-400/[0.025]"
      />

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="مبيعات اليوم"
          value={formatCurrency(stats.todaySales)}
          delta={stats.todaySalesDelta ?? undefined}
          deltaLabel="مقارنة بالأمس"
          size="wide"
        />
        <MetricCard
          label="مبيعات الأسبوع"
          value={formatCurrency(stats.weekSales)}
          delta={stats.weekSalesDelta ?? undefined}
          deltaLabel="مقارنة بالأسبوع السابق"
        />
        <MetricCard
          label="طلبات جديدة"
          value={formatNumber(stats.newOrders)}
          deltaLabel={`${stats.newCustomers} عميل جديد`}
        />
        <MetricCard
          label="صافي الربح (الشهر)"
          value={formatCurrency(stats.netProfit)}
        />
      </div>

      {/* Professional analytics */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">التحليلات</h2>
          <p className="text-sm text-muted-foreground">
            نظرة على المبيعات وتوزيع الطلبات والمنتجات
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/statistics" className="gap-1">
            تفاصيل أكثر
            <ArrowLeft className="size-3.5" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <StatChartCard
          title="تطور مبيعات الأسبوع"
          subtitle="منحنى الإيراد اليومي"
          icon={TrendingUp}
          accent={CHART_COLORS.gold}
          className="lg:col-span-2"
          empty={areaData.every((d) => d.value <= 0)}
          emptyTitle="لا توجد مبيعات هذا الأسبوع"
          emptyDescription="ستظهر المنحنيات عند تسجيل مبيعات"
        >
          <SalesAreaChart data={areaData} height={280} valueLabel="المبيعات" />
        </StatChartCard>

        <StatChartCard
          title="توزيع حالات الطلبات"
          subtitle="لقطة حالية لخط الإنتاج"
          icon={PieChart}
          accent={CHART_COLORS.berry}
          empty={statusTotal === 0}
          emptyTitle="لا توجد طلبات"
          emptyDescription="ستظهر التوزيعات عند وجود طلبات"
        >
          <StatusDonut
            data={statusMix}
            height={200}
            centerValue={formatNumber(statusTotal)}
          />
        </StatChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <StatChartCard
          title="الأكثر مبيعاً"
          subtitle="حسب الإيراد"
          icon={BarChart3}
          accent={CHART_COLORS.caramel}
          className="lg:col-span-1"
          empty={topProductsData.length === 0}
          emptyTitle="لا توجد منتجات مباعة"
          emptyDescription="ستظهر المنتجات عند إتمام الطلبات"
        >
          <TopProductsChart data={topProductsData} height={260} />
        </StatChartCard>

        <Card className="border-cacao-800/8 shadow-none lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">أحدث الطلبات</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/orders" className="gap-1">
                عرض الكل
                <ArrowLeft className="size-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {stats.recentOrders.length === 0 ? (
              <EmptyState
                icon={ShoppingBag}
                title="لا توجد طلبات"
                description="ستظهر الطلبات الجديدة هنا"
              />
            ) : (
              <div className="space-y-2.5">
                {stats.recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between rounded-xl border border-cacao-800/8 bg-gradient-to-l from-transparent to-cacao-800/[0.02] px-4 py-3"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{order.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(order.createdAt, "dd MMM yyyy HH:mm")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={order.status} type="order" />
                      <CurrencyDisplay
                        amount={order.total}
                        className="text-sm font-semibold"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-cacao-800/8 shadow-none">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-pistachio-400/15">
              <Users className="size-5 text-pistachio-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">عملاء جدد اليوم</p>
              <p className="text-2xl font-semibold tabular-nums">
                {stats.newCustomers}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-cacao-800/8 shadow-none">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-gold-400/15">
              <ShoppingBag className="size-5 text-gold-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">مبيعات الشهر</p>
              <CurrencyDisplay
                amount={stats.monthSales}
                className="text-2xl font-semibold"
              />
            </div>
          </CardContent>
        </Card>
        <Card className="border-cacao-800/8 shadow-none">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-caramel-500/15">
              <Package className="size-5 text-caramel-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">طلبات نشطة</p>
              <p className="text-2xl font-semibold tabular-nums">
                {formatNumber(
                  Object.entries(stats.ordersByStatus)
                    .filter(([k]) => k !== "completed" && k !== "cancelled")
                    .reduce((sum, [, v]) => sum + v, 0),
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
