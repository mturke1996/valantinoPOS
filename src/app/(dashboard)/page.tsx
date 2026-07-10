"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Package,
  ShoppingBag,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { CommandCenterHero } from "@/components/shared/command-center-hero";
import { MetricCard } from "@/components/shared/metric-card";
import { PageHeader } from "@/components/shared/page-header";
import { ServiceRibbon } from "@/components/shared/service-ribbon";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getState } from "@/lib/data/store";
import { getDashboardStats } from "@/lib/services/dashboard.service";
import { getTodayOperations } from "@/lib/services/operations.service";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import type { DashboardStats } from "@/types";
import { ORDER_STATUSES } from "@/lib/constants/order-status";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const state = getState();
    setStats(getDashboardStats(state));
    setLoading(false);
  }, []);

  const todayOperations = useMemo(() => {
    if (!stats) return [];
    return getTodayOperations(getState());
  }, [stats]);

  const chartData = useMemo(() => {
    if (!stats) return [];
    const pipeline = ORDER_STATUSES.filter((s) => s.index >= 0).map((s) => ({
      name: s.labelAr,
      count: stats.ordersByStatus[s.key] ?? 0,
    }));
    return pipeline;
  }, [stats]);

  const salesChart = useMemo(() => {
    if (!stats) return [];
    return stats.salesByDay;
  }, [stats]);

  if (loading) {
    return (
      <div className="space-y-6 py-4">
        <Skeleton className="h-36 w-full rounded-2xl" />
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
    <div className="space-y-6 py-4">
      <CommandCenterHero
        todaySales={stats.todaySales}
        newOrders={stats.newOrders}
        todayDeliveries={todayOperations.length}
        urgentCount={stats.urgentAlerts.length}
      />

      <ServiceRibbon items={todayOperations} />

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

      <PageHeader
        title="التفاصيل"
        description="مؤشرات الأداء والطلبات"
        actions={
          <Button asChild variant="outline">
            <Link href="/pos">فتح نقطة البيع</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-cacao-800/8 shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4 text-gold-400" />
              مبيعات الأسبوع
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} width={50} />
                  <Tooltip
                    formatter={(value: number) => [
                      formatCurrency(value),
                      "المبيعات",
                    ]}
                  />
                  <Bar
                    dataKey="sales"
                    fill="hsl(24 33% 18%)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-cacao-800/8 shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="size-4 text-caramel-500" />
              الطلبات حسب الحالة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={80}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip />
                  <Bar
                    dataKey="count"
                    fill="hsl(43 65% 52%)"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
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
              <div className="space-y-3">
                {stats.recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between rounded-md border border-cacao-800/8 px-4 py-3"
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

        <div className="space-y-4">
          <Card className="border-cacao-800/8 shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="size-4 text-caramel-500" />
                تنبيهات المخزون
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-md bg-caramel-500/10 px-3 py-2">
                <span className="text-sm">منتجات منخفضة</span>
                <Badge variant="outline">{stats.lowStockProducts}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-md bg-berry-500/10 px-3 py-2">
                <span className="text-sm">دفعات قاربت الانتهاء</span>
                <Badge variant="outline">{stats.expiringBatches}</Badge>
              </div>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href="/inventory">إدارة المخزون</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-cacao-800/8 shadow-none">
            <CardHeader>
              <CardTitle className="text-base">الأكثر مبيعاً</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.topProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">لا توجد بيانات بعد</p>
              ) : (
                <div className="space-y-3">
                  {stats.topProducts.map((product, i) => (
                    <div
                      key={product.productId}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex size-6 items-center justify-center rounded-sm bg-cacao-800/8 text-xs font-medium">
                          {i + 1}
                        </span>
                        <span className="truncate text-sm">{product.nameAr}</span>
                      </div>
                      <CurrencyDisplay
                        amount={product.revenue}
                        className="text-xs"
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-cacao-800/8 shadow-none">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-10 items-center justify-center rounded-md bg-pistachio-400/15">
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
            <div className="flex size-10 items-center justify-center rounded-md bg-gold-400/15">
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
            <div className="flex size-10 items-center justify-center rounded-md bg-caramel-500/15">
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
