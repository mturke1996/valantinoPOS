"use client";

import { useCallback, useState } from "react";
import { Clock, Lock, Unlock } from "lucide-react";

import { CurrencyDisplay } from "@/components/shared/currency-display";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { ZReportDialog } from "@/components/pos/z-report-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ShiftPanel } from "@/components/pos/shift-panel";
import { useStoreSubscription } from "@/hooks/use-store-subscription";
import { getAuthSession } from "@/lib/auth";
import {
  getOpenShift,
  getSettings,
  getShifts,
} from "@/lib/data/store";
import { formatDateTime } from "@/lib/utils";
import type { Shift } from "@/types";

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [openShift, setOpenShiftState] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const [zReportShift, setZReportShift] = useState<Shift | null>(null);

  const refresh = useCallback(() => {
    const settings = getSettings();
    setShifts(
      [...getShifts()]
        .filter((s) => s.branchId === settings.branchId)
        .sort(
          (a, b) =>
            new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime(),
        ),
    );
    setOpenShiftState(getOpenShift(settings.branchId) ?? null);
    setLoading(false);
  }, []);

  useStoreSubscription(refresh);

  const session = getAuthSession();

  if (loading) {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      <PageHeader
        title="الورديات"
        description="فتح وإغلاق الورديات وتقارير Z"
      />

      <Card className="border-cacao-800/8 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">الوردية الحالية</CardTitle>
        </CardHeader>
        <CardContent>
          <ShiftPanel
            shift={openShift}
            onShiftChange={(shift) => {
              setOpenShiftState(shift);
              refresh();
              if (shift?.status === "closed") {
                setZReportShift(shift);
              }
            }}
          />
        </CardContent>
      </Card>

      {shifts.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="لا توجد ورديات سابقة"
          description="افتح وردية جديدة لبدء البيع"
        />
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">سجل الورديات</h2>
          {shifts.map((shift) => (
            <div
              key={shift.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-cacao-800/8 p-4"
            >
              <div>
                <p className="font-medium">
                  {formatDateTime(shift.openedAt)}
                  {shift.closedAt
                    ? ` — ${formatDateTime(shift.closedAt)}`
                    : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  رصيد افتتاحي:{" "}
                  <CurrencyDisplay
                    amount={shift.openingFloat}
                    className="inline text-xs"
                  />
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={shift.status === "open" ? "default" : "secondary"}>
                  {shift.status === "open" ? "مفتوحة" : "مغلقة"}
                </Badge>
                {shift.status === "closed" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZReportShift(shift)}
                  >
                    Z-Report
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <ZReportDialog
        shift={zReportShift}
        open={zReportShift !== null}
        onOpenChange={(open) => {
          if (!open) setZReportShift(null);
        }}
        cashierName={session?.name}
      />
    </div>
  );
}
