"use client";

import { useCallback, useState } from "react";
import {
  Download,
  FileBarChart,
  FileSpreadsheet,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getDashboardStats } from "@/lib/services/dashboard.service";
import { exportReport } from "@/lib/export-reports";
import { getState } from "@/lib/data/store";
import { useStoreSubscription } from "@/hooks/use-store-subscription";
import { formatCurrency } from "@/lib/utils";

const REPORTS = [
  {
    id: "sales",
    title: "تقرير المبيعات",
    description: "ملخص المبيعات اليومية والأسبوعية والشهرية",
    icon: FileBarChart,
  },
  {
    id: "customers",
    title: "تقرير العملاء",
    description: "الولاء والإنفاق وعدد الطلبات",
    icon: Users,
  },
  {
    id: "profit",
    title: "تقرير الأرباح",
    description: "صافي الربح والتكاليف",
    icon: FileSpreadsheet,
  },
];

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Record<string, string>>({});

  const refresh = useCallback(() => {
    const state = getState();
    const stats = getDashboardStats(state);
    setSummary({
      sales: formatCurrency(stats.monthSales),
      customers: `${stats.newCustomers} عميل جديد`,
      profit: formatCurrency(stats.netProfit),
    });
    setLoading(false);
  }, []);

  useStoreSubscription(refresh);

  const handleExport = (reportId: string, format: "csv" | "xlsx") => {
    try {
      exportReport(reportId, format, getState());
      toast.success(`تم تصدير ${reportId} بصيغة ${format.toUpperCase()}`);
    } catch {
      toast.error("فشل التصدير");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      <PageHeader
        title="التقارير"
        description="تصدير وتحميل التقارير المالية والتشغيلية"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((report) => (
          <Card key={report.id} className="border-cacao-800/8 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <report.icon className="size-4 text-gold-400" />
                {report.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {report.description}
              </p>
              <p className="text-lg font-semibold tabular-nums">
                {summary[report.id]}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleExport(report.id, "csv")}
                >
                  <Download className="size-3.5" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleExport(report.id, "xlsx")}
                >
                  <Download className="size-3.5" />
                  Excel
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
