"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgePercent, Banknote, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { CurrencyDisplay } from "@/components/shared/currency-display";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useSettings } from "@/hooks/use-settings";
import { Label } from "@/components/ui/label";
import {
  getCustomerById,
  redeemLoyaltyDiscount,
} from "@/lib/data/store";
import { cn, formatNumber, roundMoney } from "@/lib/utils";

type DiscountMode = "fixed" | "percentage" | "loyalty";

interface PosDiscountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subtotal: number;
  currentDiscount: number;
  customerId?: string | null;
  onApply: (amount: number) => void;
}

export function PosDiscountDialog({
  open,
  onOpenChange,
  subtotal,
  currentDiscount,
  customerId,
  onApply,
}: PosDiscountDialogProps) {
  const settings = useSettings();
  const [mode, setMode] = useState<DiscountMode>("fixed");
  const [value, setValue] = useState("");
  const customer = customerId ? getCustomerById(customerId) : null;

  useEffect(() => {
    if (!open) return;
    setMode("fixed");
    setValue(currentDiscount > 0 ? String(currentDiscount) : "");
  }, [currentDiscount, open]);

  const loyaltyPreview = useMemo(() => {
    if (!customer || mode !== "loyalty") return 0;
    const points = Number.parseInt(value, 10);
    if (!Number.isFinite(points) || points <= 0) return 0;
    return roundMoney(
      Math.min(
        points * settings.loyaltyRedeemRate,
        subtotal,
        customer.loyaltyPoints * settings.loyaltyRedeemRate,
      ),
    );
  }, [customer, mode, settings.loyaltyRedeemRate, subtotal, value]);

  const preview = useMemo(() => {
    if (mode === "loyalty") return loyaltyPreview;
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    const amount =
      mode === "percentage" ? subtotal * (Math.min(parsed, 100) / 100) : parsed;
    return roundMoney(Math.min(amount, subtotal));
  }, [loyaltyPreview, mode, subtotal, value]);

  const invalidPercentage =
    mode === "percentage" && Number.parseFloat(value) > 100;

  const apply = () => {
    if (invalidPercentage) return;
    if (mode === "loyalty") {
      if (!customerId || !customer) {
        toast.error("اختر عميلاً لاستبدال النقاط");
        return;
      }
      const points = Number.parseInt(value, 10);
      if (!Number.isFinite(points) || points <= 0) return;
      try {
        const { discountAmount } = redeemLoyaltyDiscount(customerId, points);
        onApply(discountAmount);
        onOpenChange(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "فشل الاستبدال");
      }
      return;
    }
    onApply(preview);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>خصم الفاتورة</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant={mode === "fixed" ? "default" : "outline"}
              className="h-auto flex-col gap-1.5 py-3"
              onClick={() => setMode("fixed")}
            >
              <Banknote className="size-4" />
              <span className="text-[10px]">مبلغ</span>
            </Button>
            <Button
              type="button"
              variant={mode === "percentage" ? "default" : "outline"}
              className="h-auto flex-col gap-1.5 py-3"
              onClick={() => setMode("percentage")}
            >
              <BadgePercent className="size-4" />
              <span className="text-[10px]">نسبة</span>
            </Button>
            <Button
              type="button"
              variant={mode === "loyalty" ? "default" : "outline"}
              className="h-auto flex-col gap-1.5 py-3"
              onClick={() => setMode("loyalty")}
              disabled={!customer}
            >
              <Sparkles className="size-4" />
              <span className="text-[10px]">ولاء</span>
            </Button>
          </div>

          {mode === "loyalty" && customer ? (
            <div className="rounded-lg bg-gold-400/10 px-3 py-2 text-sm">
              رصيد النقاط:{" "}
              <span className="font-mono font-semibold">
                {formatNumber(customer.loyaltyPoints)}
              </span>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="pos-discount-value">
              {mode === "fixed"
                ? "مبلغ الخصم"
                : mode === "percentage"
                  ? "نسبة الخصم"
                  : "نقاط الاستبدال"}
            </Label>
            <div className="relative">
              <Input
                id="pos-discount-value"
                type="number"
                min="0"
                max={
                  mode === "percentage"
                    ? "100"
                    : mode === "loyalty"
                      ? customer?.loyaltyPoints
                      : subtotal
                }
                step={mode === "loyalty" ? "1" : "0.01"}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                dir="ltr"
                autoFocus
                className={cn(
                  "pe-12 font-mono text-lg tabular-nums",
                  invalidPercentage &&
                    "border-destructive focus-visible:ring-destructive",
                )}
              />
              <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {mode === "fixed"
                  ? settings.currencySymbol
                  : mode === "percentage"
                    ? "%"
                    : "نقطة"}
              </span>
            </div>
            {invalidPercentage ? (
              <p className="text-xs text-destructive">
                نسبة الخصم لا يمكن أن تتجاوز 100%
              </p>
            ) : null}
          </div>

          <div className="flex items-center justify-between rounded-lg bg-cacao-800/5 px-3 py-2 text-sm">
            <span className="text-muted-foreground">الخصم المطبق</span>
            <CurrencyDisplay amount={preview} className="font-semibold" />
          </div>
        </div>

        <DialogFooter>
          {currentDiscount > 0 ? (
            <Button
              variant="ghost"
              onClick={() => {
                onApply(0);
                onOpenChange(false);
              }}
            >
              إزالة الخصم
            </Button>
          ) : null}
          <Button onClick={apply} disabled={preview <= 0 || invalidPercentage}>
            تطبيق الخصم
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
