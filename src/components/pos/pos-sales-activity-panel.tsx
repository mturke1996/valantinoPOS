"use client";

import Link from "next/link";
import { ArrowLeftRight, Banknote, CreditCard, History, ReceiptText, ShoppingBag } from "lucide-react";

import { CurrencyDisplay } from "@/components/shared/currency-display";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { PosSalesActivity } from "@/lib/services/operations.service";
import type { OrderType, PaymentMethod } from "@/types";

const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  pos: "بيع فوري",
  delivery: "توصيل",
  event: "مناسبة",
  reservation: "حجز",
  online: "إلكتروني",
};

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "نقدي",
  card: "بطاقة",
  transfer: "تحويل",
  mixed: "مختلط",
  credit: "آجل",
};

interface PosSalesActivityPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: PosSalesActivity;
  hasOpenShift: boolean;
}

export function PosSalesActivityPanel({
  open,
  onOpenChange,
  activity,
  hasOpenShift,
}: PosSalesActivityPanelProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90svh] flex-col overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-cacao-800/10 px-6 py-5">
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <History className="size-5 text-gold-400" />
            نشاط البيع والتحصيل
            <Badge variant={hasOpenShift ? "default" : "secondary"}>
              {hasOpenShift ? "الوردية الحالية" : "اليوم"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="border-b border-cacao-800/10 p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-cacao-800 p-4 text-cream-50">
              <p className="text-xs text-cream-100/70">إجمالي المبالغ المحصلة</p>
              <CurrencyDisplay
                amount={activity.collectedTotal}
                className="mt-1 text-3xl font-semibold"
              />
              <p className="mt-2 text-xs text-cream-100/60">
                {activity.collectionCount} عملية تحصيل · {activity.orderCount} طلب
              </p>
            </div>

            <div className="rounded-lg border border-cacao-800/10 bg-card p-4">
              <Banknote className="mb-3 size-4 text-pistachio-400" />
              <p className="text-xs text-muted-foreground">نقدي</p>
              <CurrencyDisplay
                amount={activity.cashTotal}
                className="mt-1 text-lg font-semibold"
              />
            </div>

            <div className="rounded-lg border border-cacao-800/10 bg-card p-4">
              <CreditCard className="mb-3 size-4 text-gold-400" />
              <p className="text-xs text-muted-foreground">بطاقات</p>
              <CurrencyDisplay
                amount={activity.cardTotal}
                className="mt-1 text-lg font-semibold"
              />
            </div>

            <div className="rounded-lg border border-cacao-800/10 bg-card p-4">
              <ArrowLeftRight className="mb-3 size-4 text-caramel-500" />
              <p className="text-xs text-muted-foreground">تحويل</p>
              <CurrencyDisplay
                amount={activity.transferTotal}
                className="mt-1 text-lg font-semibold"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span>
              متوسط الطلب:{" "}
              <CurrencyDisplay
                amount={activity.averageTicket}
                className="font-medium text-foreground"
              />
            </span>
            <span>تحصيلات مجدولة: {activity.scheduledCollections}</span>
            <span>آخر عملية: {activity.lastAt ?? "لا توجد"}</span>
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          {activity.entries.length === 0 ? (
            <EmptyState
              icon={ReceiptText}
              title="لا توجد عمليات تحصيل"
              description="ستظهر المبيعات والعربون والمدفوعات هنا فور تسجيلها"
              className="py-14"
            />
          ) : (
            <div className="divide-y divide-cacao-800/10">
              {activity.entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 px-5 py-3.5"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-cacao-800/[0.06]">
                    <ShoppingBag className="size-4 text-cacao-800 dark:text-cream-100" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-sm font-semibold tabular-nums">
                        {entry.orderNumber}
                      </p>
                      <Badge variant="outline" className="text-[10px]">
                        {ORDER_TYPE_LABELS[entry.orderType]}
                      </Badge>
                      <StatusBadge
                        type="payment"
                        status={entry.paymentStatus}
                        className="text-[10px]"
                      />
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {entry.customerName} ·{" "}
                      {PAYMENT_METHOD_LABELS[entry.paymentMethod]} · {entry.time}
                    </p>
                  </div>

                  <div className="shrink-0 text-end">
                    <CurrencyDisplay
                      amount={entry.amount}
                      className="text-sm font-semibold"
                    />
                    <Button
                      asChild
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-[11px]"
                    >
                      <Link
                        href={`/orders?highlight=${entry.orderId}`}
                        onClick={() => onOpenChange(false)}
                      >
                        عرض الطلب
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
