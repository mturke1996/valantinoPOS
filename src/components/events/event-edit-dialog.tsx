"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, PackageCheck, PartyPopper, Pencil } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { updateEventBooking } from "@/lib/data/store";
import { cn } from "@/lib/utils";
import type { Event, EventType, Order } from "@/types";

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: "wedding", label: "زفاف" },
  { value: "engagement", label: "خطوبة" },
  { value: "birth", label: "مواليد" },
  { value: "success", label: "نجاح" },
  { value: "graduation", label: "تخرج" },
  { value: "birthday", label: "عيد ميلاد" },
  { value: "corporate", label: "شركات" },
  { value: "gift", label: "هدايا" },
  { value: "other", label: "أخرى" },
];

const PACKAGING_COLORS = [
  { value: "#D4AF37", label: "ذهبي" },
  { value: "#F5EDE3", label: "كريمي" },
  { value: "#FFFFFF", label: "أبيض" },
  { value: "#3D2B1F", label: "كاكاو" },
  { value: "#8B3A62", label: "توتي" },
  { value: "#8FB996", label: "فستقي" },
] as const;

interface EventEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  event: Event | null;
  customerName?: string;
  onSaved?: () => void;
}

export function EventEditDialog({
  open,
  onOpenChange,
  order,
  event,
  customerName,
  onSaved,
}: EventEditDialogProps) {
  const [eventType, setEventType] = useState<EventType>("wedding");
  const [guestCount, setGuestCount] = useState("50");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("18:00");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [packagingColors, setPackagingColors] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !order || !event) return;
    setEventType(event.eventType);
    setGuestCount(String(event.guestCount));
    setDeliveryDate(order.deliveryDate ?? "");
    setDeliveryTime(order.deliveryTime ?? "18:00");
    setDeliveryAddress(order.deliveryAddress ?? "");
    setGiftMessage(event.giftCardMessage ?? "");
    setPackagingColors(event.packagingColors ?? []);
    setNotes(event.specialNotes ?? order.notes ?? "");
  }, [event, open, order]);

  const fulfillment = useMemo(
    () =>
      order?.deliveryAddress &&
      order.deliveryAddress !== "استلام من المتجر"
        ? "delivery"
        : "pickup",
    [order?.deliveryAddress],
  );

  const togglePackagingColor = (color: string) => {
    setPackagingColors((current) =>
      current.includes(color)
        ? current.filter((item) => item !== color)
        : [...current, color],
    );
  };

  const handleSubmit = () => {
    if (!order || !event) return;
    if (!deliveryDate || !deliveryTime) {
      toast.error("حدد تاريخ ووقت التسليم");
      return;
    }
    if (
      fulfillment === "delivery" &&
      deliveryAddress.trim().length < 5
    ) {
      toast.error("أدخل عنوان التوصيل");
      return;
    }

    setSaving(true);
    try {
      const result = updateEventBooking({
        orderId: order.id,
        eventType,
        guestCount: Math.max(1, Number.parseInt(guestCount, 10) || 1),
        packagingColors,
        giftCardMessage: giftMessage.trim() || null,
        giftCardPhrase: giftMessage.trim() || null,
        specialNotes: notes.trim() || null,
        deliveryDate,
        deliveryTime,
        deliveryAddress:
          fulfillment === "delivery"
            ? deliveryAddress.trim()
            : "استلام من المتجر",
        notes: notes.trim() || null,
      });
      if (!result) throw new Error("تعذر تحديث المناسبة");
      toast.success(`تم تحديث ${order.orderNumber}`);
      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "فشل تحديث المناسبة",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!order || !event) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(94dvh,100svh)] flex-col overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-cacao-800/8">
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-5 text-gold-400" />
            تعديل المناسبة — {order.orderNumber}
          </DialogTitle>
          {customerName ? (
            <p className="text-sm text-muted-foreground">{customerName}</p>
          ) : null}
        </DialogHeader>

        <DialogBody className="space-y-6 py-5">
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <PartyPopper className="size-4 text-gold-400" />
              <h3 className="text-sm font-semibold">تفاصيل المناسبة</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>نوع المناسبة</Label>
                <Select
                  value={eventType}
                  onValueChange={(value) => setEventType(value as EventType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-guests">عدد الضيوف</Label>
                <Input
                  id="edit-guests"
                  type="number"
                  min="1"
                  value={guestCount}
                  onChange={(e) => setGuestCount(e.target.value)}
                  dir="ltr"
                />
              </div>
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <CalendarClock className="size-4 text-gold-400" />
              <h3 className="text-sm font-semibold">الموعد</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-date">تاريخ التسليم</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-time">وقت التسليم</Label>
                <Input
                  id="edit-time"
                  type="time"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  dir="ltr"
                />
              </div>
            </div>
            {fulfillment === "delivery" ? (
              <div className="space-y-2">
                <Label htmlFor="edit-address">عنوان التوصيل</Label>
                <Input
                  id="edit-address"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                />
              </div>
            ) : (
              <Badge variant="outline">استلام من المتجر</Badge>
            )}
          </section>

          <Separator />

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <PackageCheck className="size-4 text-gold-400" />
              <h3 className="text-sm font-semibold">التغليف والملاحظات</h3>
            </div>
            <div>
              <Label>ألوان التغليف</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {PACKAGING_COLORS.map((color) => {
                  const selected = packagingColors.includes(color.value);
                  return (
                    <button
                      key={color.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => togglePackagingColor(color.value)}
                      className={cn(
                        "flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs transition-colors",
                        selected
                          ? "border-gold-400/50 bg-gold-400/10"
                          : "border-cacao-800/10 hover:bg-cacao-800/[0.03]",
                      )}
                    >
                      <span
                        className="size-4 rounded-sm border border-black/10"
                        style={{ backgroundColor: color.value }}
                      />
                      {color.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-gift">بطاقة الإهداء</Label>
              <Textarea
                id="edit-gift"
                value={giftMessage}
                onChange={(e) => setGiftMessage(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">تعليمات التجهيز</Label>
              <Textarea
                id="edit-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </section>
        </DialogBody>

        <DialogFooter className="flex-col gap-2 border-t border-cacao-800/8 bg-card sm:flex-row">
          <Button
            variant="ghost"
            className="min-h-11 w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            إلغاء
          </Button>
          <Button
            className="min-h-11 w-full sm:w-auto"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
