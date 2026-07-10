"use client";

import { useCallback, useState } from "react";
import { Plus, Undo2 } from "lucide-react";

import { CurrencyDisplay } from "@/components/shared/currency-display";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { ReturnCreateDialog } from "@/components/returns/return-create-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useStoreSubscription } from "@/hooks/use-store-subscription";
import { getOrders, getReturns } from "@/lib/data/store";
import { formatDate } from "@/lib/utils";
import type { Return } from "@/types";

const REFUND_LABELS: Record<string, string> = {
  cash: "نقدي",
  card: "بطاقة",
  credit: "رصيد",
};

export default function ReturnsPage() {
  const [returns, setReturns] = useState<Return[]>([]);
  const [orderMap, setOrderMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const refresh = useCallback(() => {
    setReturns(getReturns());
    setOrderMap(new Map(getOrders().map((o) => [o.id, o.orderNumber])));
    setLoading(false);
  }, []);

  useStoreSubscription(refresh);

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
        title="المرتجعات"
        description="سجل المرتجعات والاسترداد"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            مرتجع جديد
          </Button>
        }
      />

      {returns.length === 0 ? (
        <EmptyState icon={Undo2} title="لا توجد مرتجعات" />
      ) : (
        <div className="space-y-3">
          {returns.map((ret) => (
            <div
              key={ret.id}
              className="rounded-lg border border-cacao-800/8 p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{ret.returnNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    طلب: {orderMap.get(ret.orderId) ?? ret.orderId}
                  </p>
                </div>
                <div className="text-end">
                  <CurrencyDisplay
                    amount={ret.totalRefund}
                    className="font-semibold"
                  />
                  <Badge variant="outline" className="mt-1">
                    {REFUND_LABELS[ret.refundMethod] ?? ret.refundMethod}
                  </Badge>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {formatDate(ret.createdAt)} · {ret.items.length} بند
              </p>
            </div>
          ))}
        </div>
      )}

      <ReturnCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={refresh}
      />
    </div>
  );
}
