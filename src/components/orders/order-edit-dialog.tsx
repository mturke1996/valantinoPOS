"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Loader2, MapPin, Pencil, StickyNote } from "lucide-react";
import { toast } from "sonner";

import { CartItemNoteField } from "@/components/pos/cart-item-note-field";
import { NotesComposer } from "@/components/shared/notes-composer";
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
import { Separator } from "@/components/ui/separator";
import { getAuthSession } from "@/lib/auth";
import { updateOrder } from "@/lib/data/store";
import type { Order } from "@/types";

interface OrderEditDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function OrderEditDialog({
  order,
  open,
  onOpenChange,
  onSaved,
}: OrderEditDialogProps) {
  const [notes, setNotes] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryZone, setDeliveryZone] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("0");
  const [deliveryRecipientName, setDeliveryRecipientName] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const showDeliveryFields = useMemo(() => {
    if (!order) return false;
    return (
      order.type === "delivery" ||
      order.type === "event" ||
      order.type === "reservation" ||
      Boolean(order.deliveryAddress) ||
      Boolean(order.deliveryDate)
    );
  }, [order]);

  useEffect(() => {
    if (!open || !order) return;
    setNotes(order.notes ?? "");
    setDeliveryInstructions(order.deliveryInstructions ?? "");
    setDeliveryDate(order.deliveryDate ?? "");
    setDeliveryTime(order.deliveryTime ?? "");
    setDeliveryAddress(order.deliveryAddress ?? "");
    setDeliveryZone(order.deliveryZone ?? "");
    setDeliveryFee(String(order.deliveryFee ?? 0));
    setDeliveryRecipientName(order.deliveryRecipientName ?? "");
    setDeliveryPhone(order.deliveryPhone ?? "");
    setItemNotes(
      Object.fromEntries(
        order.items.map((item) => [item.id, item.notes ?? ""]),
      ),
    );
  }, [open, order]);

  if (!order) return null;

  const handleSave = () => {
    setSaving(true);
    try {
      const parsedDeliveryFee = Math.max(
        0,
        Number.parseFloat(deliveryFee) || 0,
      );
      const updated = updateOrder({
        orderId: order.id,
        notes: notes.trim() || null,
        deliveryInstructions: deliveryInstructions.trim() || null,
        deliveryDate: deliveryDate || null,
        deliveryTime: deliveryTime || null,
        deliveryAddress: deliveryAddress.trim() || null,
        deliveryZone: deliveryZone.trim() || null,
        deliveryFee: showDeliveryFields ? parsedDeliveryFee : undefined,
        deliveryRecipientName: deliveryRecipientName.trim() || null,
        deliveryPhone: deliveryPhone.trim() || null,
        itemNotes: order.items.map((item) => ({
          id: item.id,
          notes: itemNotes[item.id]?.trim() || null,
        })),
        changedBy: getAuthSession()?.userId ?? null,
      });
      if (!updated) throw new Error("تعذر العثور على الطلب");
      toast.success(`تم حفظ تعديلات ${order.orderNumber}`);
      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "فشل حفظ التعديلات");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(94dvh,100svh)] flex-col overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-cacao-800/8">
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-4 text-gold-400" />
            تعديل الطلب {order.orderNumber}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-5 py-5">
          <NotesComposer
            id={`order-edit-notes-${order.id}`}
            label="ملاحظات الطلب"
            description="تظهر في الفاتورة وملخص الطلب."
            value={notes}
            onChange={setNotes}
            suggestions={[]}
            maxLength={500}
            rows={3}
          />

          {showDeliveryFields ? (
            <>
              <Separator />
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-pistachio-400" />
                  <h3 className="text-sm font-semibold">التوصيل والموعد</h3>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`order-edit-date-${order.id}`}>
                      تاريخ التسليم
                    </Label>
                    <Input
                      id={`order-edit-date-${order.id}`}
                      type="date"
                      value={deliveryDate}
                      onChange={(event) => setDeliveryDate(event.target.value)}
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`order-edit-time-${order.id}`}>
                      وقت التسليم
                    </Label>
                    <Input
                      id={`order-edit-time-${order.id}`}
                      type="time"
                      value={deliveryTime}
                      onChange={(event) => setDeliveryTime(event.target.value)}
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                  <div className="space-y-2">
                    <Label htmlFor={`order-edit-zone-${order.id}`}>
                      المنطقة
                    </Label>
                    <Input
                      id={`order-edit-zone-${order.id}`}
                      value={deliveryZone}
                      onChange={(event) => setDeliveryZone(event.target.value)}
                      placeholder="طرابلس المركز"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`order-edit-fee-${order.id}`}>
                      رسوم التوصيل
                    </Label>
                    <Input
                      id={`order-edit-fee-${order.id}`}
                      type="number"
                      min={0}
                      step={0.5}
                      value={deliveryFee}
                      onChange={(event) => setDeliveryFee(event.target.value)}
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`order-edit-address-${order.id}`}>
                    العنوان
                  </Label>
                  <Input
                    id={`order-edit-address-${order.id}`}
                    value={deliveryAddress}
                    onChange={(event) => setDeliveryAddress(event.target.value)}
                    placeholder="الشارع، المبنى، الطابق"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`order-edit-recipient-${order.id}`}>
                      اسم المستلم
                    </Label>
                    <Input
                      id={`order-edit-recipient-${order.id}`}
                      value={deliveryRecipientName}
                      onChange={(event) =>
                        setDeliveryRecipientName(event.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`order-edit-phone-${order.id}`}>
                      هاتف التوصيل
                    </Label>
                    <Input
                      id={`order-edit-phone-${order.id}`}
                      value={deliveryPhone}
                      onChange={(event) => setDeliveryPhone(event.target.value)}
                      inputMode="tel"
                      dir="ltr"
                    />
                  </div>
                </div>

                <NotesComposer
                  id={`order-edit-delivery-${order.id}`}
                  label="تعليمات التسليم"
                  value={deliveryInstructions}
                  onChange={setDeliveryInstructions}
                  suggestions={[]}
                  maxLength={500}
                  rows={2}
                />
              </section>
            </>
          ) : null}

          <Separator />

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <StickyNote className="size-4 text-gold-400" />
              <h3 className="text-sm font-semibold">ملاحظات الأصناف</h3>
            </div>
            <div className="space-y-3">
              {order.items.map((item) => (
                <CartItemNoteField
                  key={item.id}
                  value={itemNotes[item.id] ?? ""}
                  onChange={(value) =>
                    setItemNotes((current) => ({
                      ...current,
                      [item.id]: value,
                    }))
                  }
                  productName={item.productNameAr}
                  pinned
                />
              ))}
            </div>
          </section>
        </DialogBody>

        <DialogFooter className="gap-2 border-t border-cacao-800/8 sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            إلغاء
          </Button>
          <Button
            type="button"
            className="min-w-28"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <CalendarClock className="size-4" />
                حفظ التعديلات
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
