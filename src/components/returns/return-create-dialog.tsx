"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { getAuthSession } from "@/lib/auth";
import {
  createReturn,
  getOpenShift,
  getOrderById,
  getOrders,
  getSettings,
} from "@/lib/data/store";
import type { Order, RefundMethod } from "@/types";

interface ReturnCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  defaultOrderId?: string | null;
}

export function ReturnCreateDialog({
  open,
  onOpenChange,
  onCreated,
  defaultOrderId,
}: ReturnCreateDialogProps) {
  const [orderId, setOrderId] = useState(defaultOrderId ?? "");
  const [order, setOrder] = useState<Order | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [restockMap, setRestockMap] = useState<Record<string, boolean>>({});
  const [refundMethod, setRefundMethod] = useState<RefundMethod>("cash");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const orders = getOrders().filter(
    (o) => o.paymentStatus === "paid" || o.paymentStatus === "partial",
  );

  useEffect(() => {
    if (!open) return;
    setOrderId(defaultOrderId ?? "");
  }, [defaultOrderId, open]);

  useEffect(() => {
    const selected = orderId ? getOrderById(orderId) ?? null : null;
    setOrder(selected);
    if (selected) {
      const qty: Record<string, number> = {};
      const restock: Record<string, boolean> = {};
      for (const item of selected.items) {
        qty[item.id] = 0;
        restock[item.id] = true;
      }
      setQuantities(qty);
      setRestockMap(restock);
    }
  }, [orderId]);

  const handleSave = () => {
    if (!order) {
      toast.error("اختر طلباً");
      return;
    }
    const items = order.items
      .filter((item) => (quantities[item.id] ?? 0) > 0)
      .map((item) => ({
        orderItemId: item.id,
        productId: item.productId,
        quantity: quantities[item.id] ?? 0,
        restock: restockMap[item.id] ?? true,
      }));
    if (items.length === 0) {
      toast.error("حدد كمية الإرجاع");
      return;
    }

    setSaving(true);
    try {
      const settings = getSettings();
      const session = getAuthSession();
      createReturn({
        branchId: settings.branchId,
        orderId: order.id,
        items,
        refundMethod,
        notes: notes.trim() || null,
        createdBy: session?.userId ?? null,
        shiftId: getOpenShift(settings.branchId)?.id ?? null,
      });
      toast.success("تم تسجيل المرتجع");
      onCreated();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "فشل الإرجاع");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(94dvh,100svh)] flex-col overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border/60">
          <DialogTitle>مرتجع جديد</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="return-order">الطلب</Label>
            <Select value={orderId} onValueChange={setOrderId}>
              <SelectTrigger id="return-order" aria-label="اختر الطلب">
                <SelectValue placeholder="اختر الطلب" />
              </SelectTrigger>
              <SelectContent>
                {orders.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.orderNumber} —{" "}
                    <CurrencyDisplay amount={o.total} className="inline text-sm" />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {order ? (
            <div className="space-y-3 rounded-lg border p-3">
              {order.items.map((item) => (
                <div key={item.id} className="grid gap-2 sm:grid-cols-[1fr_96px_auto]">
                  <div>
                    <p className="text-sm font-medium">{item.productNameAr}</p>
                    <p className="text-xs text-muted-foreground">
                      الكمية المباعة: {item.quantity}
                    </p>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    max={item.quantity}
                    value={quantities[item.id] ?? 0}
                    onChange={(e) =>
                      setQuantities((prev) => ({
                        ...prev,
                        [item.id]: Number(e.target.value) || 0,
                      }))
                    }
                    dir="ltr"
                    aria-label={`كمية مرتجع ${item.productNameAr}`}
                  />
                  <div className="flex items-center gap-2 text-xs">
                    <Switch
                      id={`restock-${item.id}`}
                      checked={restockMap[item.id] ?? true}
                      onCheckedChange={(checked) =>
                        setRestockMap((prev) => ({
                          ...prev,
                          [item.id]: checked,
                        }))
                      }
                      aria-label={`إعادة ${item.productNameAr} للمخزون`}
                    />
                    <Label htmlFor={`restock-${item.id}`} className="cursor-pointer">
                      إعادة للمخزون
                    </Label>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="return-refund-method">طريقة الاسترداد</Label>
            <Select
              value={refundMethod}
              onValueChange={(v) => setRefundMethod(v as RefundMethod)}
            >
              <SelectTrigger id="return-refund-method" aria-label="طريقة الاسترداد">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">نقدي</SelectItem>
                <SelectItem value="card">بطاقة</SelectItem>
                <SelectItem value="credit">رصيد عميل</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="return-notes">ملاحظات</Label>
            <Input
              id="return-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            variant="outline"
            className="min-h-11 w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            إلغاء
          </Button>
          <Button
            className="min-h-11 w-full sm:w-auto"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "جاري..." : "تسجيل المرتجع"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
