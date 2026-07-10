"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  MapPin,
  PartyPopper,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { PosPaymentDialog } from "@/components/pos/pos-payment-dialog";
import { CurrencyDisplay } from "@/components/shared/currency-display";
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
import { getAuthSession } from "@/lib/auth";
import { getState, processPayment } from "@/lib/data/store";
import type { ServiceRibbonItem } from "@/lib/services/operations.service";
import type { PaymentMethod } from "@/types";

interface PosOperationsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ServiceRibbonItem[];
  shiftId: string | null;
  onSettled: () => void;
}

export function PosOperationsPanel({
  open,
  onOpenChange,
  items,
  shiftId,
  onSettled,
}: PosOperationsPanelProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [cashAmount, setCashAmount] = useState("");
  const [transferReference, setTransferReference] = useState("");
  const [processing, setProcessing] = useState(false);

  const selectedOrder = useMemo(
    () =>
      selectedOrderId
        ? getState().orders.find((order) => order.id === selectedOrderId) ?? null
        : null,
    [selectedOrderId],
  );
  const remaining = selectedOrder
    ? Math.max(0, selectedOrder.total - selectedOrder.paidAmount)
    : 0;

  const openSettlement = (orderId: string) => {
    if (!shiftId) {
      toast.error("افتح الوردية قبل تحصيل أي دفعة");
      return;
    }
    const order = getState().orders.find((item) => item.id === orderId);
    if (!order) {
      toast.error("تعذر العثور على الطلب");
      return;
    }
    const balance = Math.max(0, order.total - order.paidAmount);
    if (balance <= 0) {
      toast.info("تم سداد هذا الطلب بالكامل");
      return;
    }
    setPaymentMethod("cash");
    setCashAmount(String(balance));
    setSelectedOrderId(orderId);
    onOpenChange(false);
  };

  const settleOrder = () => {
    if (!selectedOrder || remaining <= 0) return;
    const cash = Number.parseFloat(cashAmount) || 0;

    if (paymentMethod === "cash" && cash < remaining) {
      toast.error("المبلغ المستلم أقل من المبلغ المتبقي");
      return;
    }

    setProcessing(true);
    try {
      processPayment({
        orderId: selectedOrder.id,
        shiftId,
        method: paymentMethod,
        amount: remaining,
        cashAmount: paymentMethod === "cash" ? remaining : null,
        cardAmount: paymentMethod === "card" ? remaining : null,
        reference:
          paymentMethod === "transfer"
            ? transferReference.trim() || null
            : null,
        userId: getAuthSession()?.userId ?? null,
      });
      toast.success(`تم تحصيل المتبقي للطلب ${selectedOrder.orderNumber}`);
      setSelectedOrderId(null);
      setCashAmount("");
      setTransferReference("");
      onSettled();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تسجيل الدفعة");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[88svh] flex-col sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="size-5 text-gold-400" />
              استلامات ومناسبات اليوم
              <Badge variant="secondary">{items.length}</Badge>
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="min-h-0 flex-1">
            {items.length === 0 ? (
              <div className="flex flex-col items-center py-14 text-center">
                <CheckCircle2 className="size-9 text-pistachio-400" />
                <p className="mt-3 text-sm font-medium">جدول اليوم هادئ</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  لا توجد استلامات أو مناسبات مجدولة
                </p>
              </div>
            ) : (
              <div className="space-y-2 py-2">
                {items.map((item) => {
                  const balance = Math.max(0, item.amount - item.paidAmount);
                  const Icon =
                    item.kind === "event"
                      ? PartyPopper
                      : item.kind === "reservation"
                        ? CalendarCheck
                      : item.kind === "deposit"
                        ? Wallet
                        : MapPin;

                  return (
                    <article
                      key={item.id}
                      className="rounded-xl border border-cacao-800/8 bg-card p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gold-400/10 text-cacao-800 dark:text-gold-400">
                            <Icon className="size-4" />
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium">{item.title}</p>
                              <StatusBadge status={item.status} type="order" />
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {item.subtitle}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                          <div className="text-end">
                            <CurrencyDisplay
                              amount={item.amount}
                              className="text-sm font-semibold"
                            />
                            <p className="text-[11px] text-muted-foreground">
                              {balance > 0 ? (
                                <>
                                  متبقي{" "}
                                  <CurrencyDisplay
                                    amount={balance}
                                    className="inline text-[11px]"
                                  />
                                </>
                              ) : (
                                "مدفوع بالكامل"
                              )}
                            </p>
                          </div>
                          {balance > 0 ? (
                            <Button
                              size="sm"
                              onClick={() => openSettlement(item.orderId)}
                            >
                              تحصيل
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" asChild>
                              <Link href={item.href}>عرض</Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <PosPaymentDialog
        open={selectedOrder !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setSelectedOrderId(null);
        }}
        total={remaining}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
        cashAmount={cashAmount}
        onCashAmountChange={setCashAmount}
        transferReference={transferReference}
        onTransferReferenceChange={setTransferReference}
        processing={processing}
        onConfirm={settleOrder}
        title={
          selectedOrder ? `تحصيل ${selectedOrder.orderNumber}` : "تحصيل المتبقي"
        }
      />
    </>
  );
}
