"use client";

import { useState } from "react";
import { Ticket } from "lucide-react";
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
import { Label } from "@/components/ui/label";

interface PosCouponDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subtotal: number;
  onApply: (code: string) => boolean;
  currentCode?: string | null;
}

export function PosCouponDialog({
  open,
  onOpenChange,
  subtotal,
  onApply,
  currentCode,
}: PosCouponDialogProps) {
  const [code, setCode] = useState(currentCode ?? "");

  const apply = () => {
    const trimmed = code.trim();
    if (!trimmed) {
      toast.error("أدخل كود الكوبون");
      return;
    }
    const ok = onApply(trimmed);
    if (!ok) {
      toast.error("كوبون غير صالح أو لا ينطبق على هذا المبلغ");
      return;
    }
    toast.success("تم تطبيق الكوبون");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="size-5" />
            كوبون خصم
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-cacao-800/5 px-3 py-2 text-sm">
            <span className="text-muted-foreground">إجمالي السلة: </span>
            <CurrencyDisplay amount={subtotal} className="inline font-medium" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="coupon-code">كود الكوبون</Label>
            <Input
              id="coupon-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="VAL-2026"
              dir="ltr"
              className="font-mono uppercase"
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          {currentCode ? (
            <Button
              variant="ghost"
              onClick={() => {
                onApply("");
                onOpenChange(false);
              }}
            >
              إزالة الكوبون
            </Button>
          ) : null}
          <Button onClick={apply}>تطبيق</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
