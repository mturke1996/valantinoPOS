"use client";

import { ArrowLeftRight, CreditCard, Wallet } from "lucide-react";
import { useState } from "react";

import { CurrencyDisplay } from "@/components/shared/currency-display";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { PaymentMethod } from "@/types";
import { cn } from "@/lib/utils";

const QUICK_TENDERS = [20, 50, 100, 200] as const;

interface PosPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  cashAmount: string;
  onCashAmountChange: (value: string) => void;
  cardAmount?: string;
  onCardAmountChange?: (value: string) => void;
  transferReference?: string;
  onTransferReferenceChange?: (value: string) => void;
  processing: boolean;
  onConfirm: () => void;
  title?: string;
}

export function PosPaymentDialog({
  open,
  onOpenChange,
  total,
  paymentMethod,
  onPaymentMethodChange,
  cashAmount,
  onCashAmountChange,
  cardAmount = "",
  onCardAmountChange,
  transferReference = "",
  onTransferReferenceChange,
  processing,
  onConfirm,
  title = "إتمام الدفع",
}: PosPaymentDialogProps) {
  const [localReference, setLocalReference] = useState("");
  const reference = onTransferReferenceChange
    ? transferReference
    : localReference;
  const setReference = onTransferReferenceChange ?? setLocalReference;

  const parsedCash = Number.parseFloat(cashAmount);
  const cashTendered = Number.isFinite(parsedCash) ? parsedCash : 0;
  const parsedCard = Number.parseFloat(cardAmount);
  const cardTendered = Number.isFinite(parsedCard) ? parsedCard : 0;

  const change =
    paymentMethod === "cash"
      ? Math.max(0, cashTendered - total)
      : 0;
  const validationMessage =
    paymentMethod === "cash" && cashTendered < total
      ? "المبلغ المستلم أقل من المستحق"
      : paymentMethod === "mixed" &&
          Math.abs(cashTendered + cardTendered - total) > 0.01
        ? "مجموع النقد والبطاقة يجب أن يساوي المستحق"
        : null;

  const setQuickCash = (amount: number) => {
    onPaymentMethodChange("cash");
    onCashAmountChange(String(amount));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-5 py-2">
          <div className="rounded-xl border border-gold-400/20 bg-gradient-to-b from-gold-400/10 to-transparent p-5 text-center">
            <p className="text-sm text-muted-foreground">المبلغ المستحق</p>
            <CurrencyDisplay
              amount={total}
              className="mt-1 text-4xl font-bold tracking-tight"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(
              [
                { key: "cash" as const, label: "نقدي", icon: Wallet },
                { key: "card" as const, label: "بطاقة", icon: CreditCard },
                {
                  key: "transfer" as const,
                  label: "تحويل",
                  icon: ArrowLeftRight,
                },
                { key: "mixed" as const, label: "مختلط", icon: CreditCard },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant={paymentMethod === key ? "default" : "outline"}
                className="h-auto flex-col gap-1.5 py-3"
                onClick={() => onPaymentMethodChange(key)}
              >
                <Icon className="size-4" />
                <span className="text-xs">{label}</span>
              </Button>
            ))}
          </div>

          {paymentMethod === "cash" ? (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2">
                {QUICK_TENDERS.map((amount) => (
                  <Button
                    key={amount}
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(
                      "font-mono tabular-nums",
                      parseFloat(cashAmount) === amount &&
                        "border-gold-400/50 bg-gold-400/10",
                    )}
                    onClick={() => setQuickCash(amount)}
                  >
                    {amount}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="col-span-4"
                  onClick={() => setQuickCash(total)}
                >
                  المبلغ بالضبط
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-sm">المبلغ المستلم</label>
                <Input
                  type="number"
                  value={cashAmount}
                  onChange={(e) => onCashAmountChange(e.target.value)}
                  placeholder={String(total)}
                  dir="ltr"
                  className="font-mono text-lg tabular-nums"
                />
                {validationMessage ? (
                  <p role="alert" className="text-xs text-destructive">
                    {validationMessage}
                  </p>
                ) : null}
              </div>

              {change > 0 ? (
                <div className="flex items-center justify-between rounded-lg bg-pistachio-400/10 px-3 py-2 text-sm">
                  <span>الباقي للعميل</span>
                  <CurrencyDisplay amount={change} className="font-semibold" />
                </div>
              ) : null}
            </div>
          ) : null}

          {paymentMethod === "transfer" ? (
            <div className="space-y-2">
              <label className="text-sm">رقم مرجع التحويل (اختياري)</label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="TRX-12345"
                dir="ltr"
                className="font-mono text-start"
              />
              <p className="text-xs text-muted-foreground">
                سجّل رقم العملية البنكية لتتبع الدفع لاحقاً
              </p>
            </div>
          ) : null}

          {paymentMethod === "card" ? (
            <p className="rounded-lg bg-cacao-800/5 px-3 py-2 text-sm text-muted-foreground">
              سيتم تحصيل{" "}
              <CurrencyDisplay amount={total} className="font-medium" /> عبر
              البطاقة
            </p>
          ) : null}

          {paymentMethod === "mixed" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm">نقدي</label>
                <Input
                  type="number"
                  value={cashAmount}
                  onChange={(e) => onCashAmountChange(e.target.value)}
                  dir="ltr"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm">بطاقة</label>
                <Input
                  type="number"
                  value={cardAmount}
                  onChange={(e) => onCardAmountChange?.(e.target.value)}
                  dir="ltr"
                  className="font-mono"
                />
              </div>
              {validationMessage ? (
                <p
                  role="alert"
                  className="text-xs text-destructive sm:col-span-2"
                >
                  {validationMessage}
                </p>
              ) : null}
            </div>
          ) : null}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            onClick={onConfirm}
            disabled={processing || validationMessage !== null}
            className="min-w-28"
          >
            {processing ? "جاري..." : "تأكيد الدفع"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
