"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ORDER_STATUSES } from "@/lib/constants/order-status";
import { getDashboardStats } from "@/lib/services/dashboard.service";
import { getState } from "@/lib/data/store";
import { useStoreSubscription } from "@/hooks/use-store-subscription";
import { formatCurrency } from "@/lib/utils";
import type { DashboardStats } from "@/types";

const COLORS = ["#3D2B1F", "#D4AF37", "#C4956A", "#8FB996", "#8B3A62"];

export default function StatisticsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setStats(getDashboardStats(getState()));
    setLoading(false);
  }, []);

  useStoreSubscription(refresh);

  const statusData = useMemo(() => {
    if (!stats) return [];
    return ORDER_STATUSES.filter((s) => s.index >= 0).map((s) => ({
      name: s.labelAr,
      value: stats.ordersByStatus[s.key] ?? 0,
    }));
  }, [stats]);

  const topProductsData = useMemo(() => {
    if (!stats) return [];
    return stats.topProducts.map((p) => ({
      name: p.nameAr.length > 15 ? `${p.nameAr.slice(0, 15)}…` : p.nameAr,
      revenue: p.revenue,
      quantity: p.quantitySold,
    }));
  }, [stats]);

  const salesTrend = useMemo(() => {
    if (!stats) return [];
    return [
      { period: "اليوم", sales: stats.todaySales },
      { period: "الأسبوع", sales: stats.weekSales },
      { period: "الشهر", sales: stats.monthSales },
    ];
  }, [stats]);

  if (loading) {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6 py-4">
      <PageHeader
        title="الإحصائيات"
        description="تحليلات مرئية لأداء المتجر"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-cacao-800/8 shadow-none">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">مبيعات اليوم</p>
            <p className="text-2xl font-semibold tabular-nums">
              {formatCurrency(stats.todaySales)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-cacao-800/8 shadow-none">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">مبيعات الشهر</p>
            <p className="text-2xl font-semibold tabular-nums">
              {formatCurrency(stats.monthSales)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-cacao-800/8 shadow-none">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">صافي الربح</p>
            <p className="text-2xl font-semibold tabular-nums">
              {formatCurrency(stats.netProfit)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-cacao-800/8 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">اتجاه المبيعات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="period" />
                  <YAxis width={60} />
                  <Tooltip
                    formatter={(v: number) => [formatCurrency(v), "المبيعات"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="#3D2B1F"
                    strokeWidth={2}
                    dot={{ fill: "#D4AF37" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-cacao-800/8 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">توزيع الطلبات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData.filter((d) => d.value > 0)}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-cacao-800/8 shadow-none lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">أفضل المنتجات مبيعاً</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProductsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis width={60} />
                  <Tooltip
                    formatter={(v: number) => [formatCurrency(v), "الإيراد"]}
                  />
                  <Bar dataKey="revenue" fill="#D4AF37" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
