"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeftRight, Clock, Lock, Unlock } from "lucide-react";
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
import {
  closeShift,
  getOpenShift,
  getSettings,
  getState,
  openShift,
  recordShiftHandover,
} from "@/lib/data/store";
import { formatMoneyLabel } from "@/lib/formatters";
import { formatDateTime } from "@/lib/utils";
import { getAuthSession } from "@/lib/auth";
import type { Shift } from "@/types";

interface ShiftPanelProps {
  onShiftChange?: (shift: Shift | null) => void;
  shift?: Shift | null;
  compact?: boolean;
  onClosed?: (shift: Shift) => void;
}

export function ShiftPanel({
  onShiftChange,
  shift: shiftProp,
  compact = false,
  onClosed,
}: ShiftPanelProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"close" | "handover">("close");
  const [shift, setShift] = useState<Shift | null>(shiftProp ?? null);
  const [floatAmount, setFloatAmount] = useState("500");
  const [closingCount, setClosingCount] = useState("");
  const [handoverNotes, setHandoverNotes] = useState("");
  const onShiftChangeRef = useRef(onShiftChange);

  useEffect(() => {
    onShiftChangeRef.current = onShiftChange;
  }, [onShiftChange]);

  const refresh = useCallback(() => {
    const settings = getSettings();
    const current = getOpenShift(settings.branchId) ?? null;
    setShift(current);
    onShiftChangeRef.current?.(current);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (shiftProp !== undefined) {
      setShift(shiftProp);
    }
  }, [shiftProp]);

  const handleOpen = () => {
    refresh();
    setMode("close");
    setOpen(true);
  };

  const handleStartShift = () => {
    const session = getAuthSession();
    const settings = getSettings();
    const state = getState();
    const cashierId = session?.userId ?? state.users[0]?.id;
    if (!cashierId) {
      toast.error("لم يتم تحديد الكاشير");
      return;
    }
    try {
      const s = openShift(
        settings.branchId,
        cashierId,
        parseFloat(floatAmount) || 0,
      );
      setShift(s);
      onShiftChange?.(s);
      toast.success("تم فتح الوردية");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل فتح الوردية");
    }
  };

  const handleCloseShift = () => {
    if (!shift) return;
    const count = parseFloat(closingCount);
    if (isNaN(count)) {
      toast.error("أدخل مبلغ الجرد");
      return;
    }
    const closed = closeShift(shift.id, count);
    if (closed) {
      toast.success(
        `تم إغلاق الوردية — الفرق: ${formatMoneyLabel(closed.variance ?? 0, getSettings())}`,
      );
      setShift(null);
      onShiftChange?.(null);
      onClosed?.(closed);
      setOpen(false);
      setClosingCount("");
    }
  };

  const handleHandover = () => {
    if (!shift) return;
    const count = parseFloat(closingCount);
    if (isNaN(count)) {
      toast.error("أدخل مبلغ العد");
      return;
    }
    try {
      const session = getAuthSession();
      const updated = recordShiftHandover({
        shiftId: shift.id,
        countedCash: count,
        notes: handoverNotes.trim() || null,
        userId: session?.userId ?? null,
      });
      if (updated) {
        setShift(updated);
        onShiftChange?.(updated);
        toast.success("تم تسجيل تسليم الوردية دون إغلاقها");
        setClosingCount("");
        setHandoverNotes("");
        setOpen(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل التسليم");
    }
  };

  return (
    <>
      <Button
        variant={shift ? "default" : "outline"}
        size="sm"
        className="gap-1.5"
        onClick={handleOpen}
      >
        <Clock className="size-3.5" />
        {compact
          ? shift
            ? "مفتوحة"
            : "وردية"
          : shift
            ? "وردية مفتوحة"
            : "فتح وردية"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {!shift
                ? "فتح وردية جديدة"
                : mode === "handover"
                  ? "تسليم وردية (منتصف اليوم)"
                  : "إغلاق الوردية"}
            </DialogTitle>
          </DialogHeader>

          {shift ? (
            <div className="space-y-4 py-2">
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={mode === "close" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setMode("close")}
                >
                  إغلاق كامل
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={mode === "handover" ? "default" : "outline"}
                  className="flex-1 gap-1"
                  onClick={() => setMode("handover")}
                >
                  <ArrowLeftRight className="size-3.5" />
                  تسليم جزئي
                </Button>
              </div>
              <div className="space-y-2 rounded-lg bg-cacao-800/5 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">رصيد الافتتاح</span>
                  <CurrencyDisplay amount={shift.openingFloat} />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المتوقع في الدرج</span>
                  <CurrencyDisplay amount={shift.expectedCash} />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">بدء الوردية</span>
                  <span dir="ltr" className="text-xs tabular-nums">
                    {formatDateTime(shift.openedAt)}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>
                  {mode === "handover" ? "مبلغ العد عند التسليم" : "مبلغ الجرد الفعلي"}
                </Label>
                <Input
                  type="number"
                  value={closingCount}
                  onChange={(e) => setClosingCount(e.target.value)}
                  placeholder="0.00"
                  dir="ltr"
                />
              </div>
              {mode === "handover" ? (
                <div className="space-y-2">
                  <Label>ملاحظات التسليم</Label>
                  <Input
                    value={handoverNotes}
                    onChange={(e) => setHandoverNotes(e.target.value)}
                    placeholder="اسم الكاشير التالي / ملاحظات"
                  />
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>رصيد الافتتاح (الدرج)</Label>
                <Input
                  type="number"
                  value={floatAmount}
                  onChange={(e) => setFloatAmount(e.target.value)}
                  dir="ltr"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {shift ? (
              mode === "handover" ? (
                <Button onClick={handleHandover} className="gap-1.5">
                  <ArrowLeftRight className="size-4" />
                  تأكيد التسليم
                </Button>
              ) : (
                <Button onClick={handleCloseShift} className="gap-1.5">
                  <Lock className="size-4" />
                  إغلاق الوردية (Z-Report)
                </Button>
              )
            ) : (
              <Button onClick={handleStartShift} className="gap-1.5">
                <Unlock className="size-4" />
                بدء الوردية
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
