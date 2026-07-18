"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Banknote,
  CalendarClock,
  Check,
  MapPin,
  PartyPopper,
  ShoppingBag,
  Truck,
  UserRound,
} from "lucide-react";

import { CurrencyDisplay } from "@/components/shared/currency-display";
import { DeliveryZoneSelect } from "@/components/shared/delivery-zone-select";
import {
  DELIVERY_NOTE_SUGGESTIONS,
  NotesComposer,
  POS_NOTE_SUGGESTIONS,
  PREP_NOTE_SUGGESTIONS,
} from "@/components/shared/notes-composer";
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
import { Textarea } from "@/components/ui/textarea";
import type {
  PosFulfillmentMode,
  PosPaymentPlan,
  PosSaleContext,
  PosSaleMode,
} from "@/features/pos/stores/cart.store";
import { getSettings } from "@/lib/data/store";
import type { Customer, EventType } from "@/types";
import { cn, roundMoney } from "@/lib/utils";

const SALE_MODES: Array<{
  value: PosSaleMode;
  label: string;
  description: string;
  icon: typeof ShoppingBag;
}> = [
  {
    value: "walk_in",
    label: "بيع فوري",
    description: "دفع واستلام الآن",
    icon: ShoppingBag,
  },
  {
    value: "delivery",
    label: "توصيل",
    description: "عنوان وموعد تسليم",
    icon: Truck,
  },
  {
    value: "event",
    label: "مناسبة",
    description: "تجهيز مناسبة بعربون",
    icon: PartyPopper,
  },
  {
    value: "reservation",
    label: "حجز",
    description: "استلام أو توصيل لاحق",
    icon: CalendarClock,
  },
];

const EVENT_TYPES: Array<{ value: EventType; label: string }> = [
  { value: "wedding", label: "زفاف" },
  { value: "engagement", label: "خطوبة" },
  { value: "birthday", label: "عيد ميلاد" },
  { value: "graduation", label: "تخرج" },
  { value: "birth", label: "مواليد" },
  { value: "success", label: "نجاح" },
  { value: "corporate", label: "شركات" },
  { value: "gift", label: "هدية" },
  { value: "other", label: "أخرى" },
];

const PAYMENT_PLANS: Array<{
  value: PosPaymentPlan;
  label: string;
  description: string;
}> = [
  { value: "full", label: "دفع كامل", description: "تحصيل كامل الفاتورة الآن" },
  { value: "deposit", label: "عربون", description: "تحصيل جزء وتسجيل المتبقي" },
  { value: "later", label: "الدفع لاحقاً", description: "إنشاء الطلب دون تحصيل" },
];

export const POS_SALE_MODE_LABELS: Record<PosSaleMode, string> = {
  walk_in: "بيع فوري",
  delivery: "توصيل",
  event: "مناسبة",
  reservation: "حجز",
};

export function getCollectionAmount(
  context: PosSaleContext,
  orderTotal: number,
): number {
  if (context.mode === "walk_in" || context.paymentPlan === "full") {
    return roundMoney(orderTotal);
  }
  if (context.paymentPlan === "later") return 0;
  return roundMoney(Math.min(orderTotal, Math.max(0, context.depositAmount)));
}

interface PosSaleContextButtonProps {
  value: PosSaleContext;
  customer: Customer | null;
  onClick: () => void;
  className?: string;
}

export function PosSaleContextButton({
  value,
  customer,
  onClick,
  className,
}: PosSaleContextButtonProps) {
  const meta = SALE_MODES.find((mode) => mode.value === value.mode) ?? SALE_MODES[0]!;
  const Icon = meta.icon;
  const scheduledSummary =
    value.mode === "walk_in"
      ? "استلام ودفع مباشر"
      : [
          value.scheduledDate || "الموعد غير محدد",
          value.scheduledTime || null,
          customer?.name ?? "اختر عميلاً",
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-14 w-full items-center justify-between gap-3 border-b border-cacao-800/10 px-4 text-start",
        "transition-colors hover:bg-cacao-800/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-gold-400/10 text-gold-400">
          <Icon className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-semibold">
            {POS_SALE_MODE_LABELS[value.mode]}
          </span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {scheduledSummary}
          </span>
        </span>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">تعديل</span>
    </button>
  );
}

interface PosSaleContextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: PosSaleContext;
  customer: Customer | null;
  total: number;
  onChooseCustomer: (draft: PosSaleContext) => void;
  onSave: (context: PosSaleContext) => void;
}

export function PosSaleContextDialog({
  open,
  onOpenChange,
  value,
  customer,
  total,
  onChooseCustomer,
  onSave,
}: PosSaleContextDialogProps) {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const settings = getSettings();
  const minDate = format(new Date(), "yyyy-MM-dd");
  const scheduled = draft.mode !== "walk_in";
  const delivery =
    draft.mode === "delivery" || draft.fulfillment === "delivery";
  const collectedNow = getCollectionAmount(draft, total);
  const availableModes = settings.walkInSalesEnabled
    ? SALE_MODES
    : SALE_MODES.filter((mode) => mode.value !== "walk_in");

  useEffect(() => {
    if (!open) return;
    const next = {
      ...value,
      deliveryFee: value.deliveryFee ?? settings.defaultDeliveryFee,
      deliveryZone: value.deliveryZone ?? "",
      deliveryRecipientName:
        value.deliveryRecipientName ?? customer?.name ?? "",
      deliveryPhone:
        value.deliveryPhone ?? customer?.whatsapp ?? customer?.phone ?? "",
      deliveryInstructions: value.deliveryInstructions ?? "",
    };
    setDraft(
      !settings.walkInSalesEnabled && next.mode === "walk_in"
        ? {
            ...next,
            mode: "delivery",
            fulfillment: "delivery",
            paymentPlan: "later",
          }
        : next,
    );
    setError(null);
  }, [customer, open, settings.defaultDeliveryFee, settings.walkInSalesEnabled, value]);

  const updateDraft = (patch: Partial<PosSaleContext>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setError(null);
  };

  const chooseMode = (mode: PosSaleMode) => {
    updateDraft({
      mode,
      fulfillment: mode === "delivery" ? "delivery" : "pickup",
      deliveryFee:
        mode === "delivery" ? settings.defaultDeliveryFee : draft.deliveryFee,
      paymentPlan: mode === "walk_in" ? "full" : draft.paymentPlan,
      depositAmount: mode === "walk_in" ? 0 : draft.depositAmount,
    });
  };

  const save = () => {
    if (scheduled && !customer) {
      setError("اربط عميلاً بالطلب المجدول لحفظ بيانات التواصل");
      return;
    }
    if (scheduled && (!draft.scheduledDate || !draft.scheduledTime)) {
      setError("حدد تاريخ ووقت التنفيذ");
      return;
    }
    if (scheduled && draft.scheduledDate < minDate) {
      setError("لا يمكن اختيار موعد في الماضي");
      return;
    }
    if (delivery && !draft.deliveryAddress.trim()) {
      setError("أدخل عنوان التوصيل");
      return;
    }
    if (
      scheduled &&
      draft.paymentPlan === "deposit" &&
      (draft.depositAmount <= 0 || draft.depositAmount >= total)
    ) {
      setError("يجب أن يكون العربون أكبر من صفر وأقل من إجمالي الطلب");
      return;
    }
    if (scheduled && (!Number.isFinite(draft.guestCount) || draft.guestCount < 1)) {
      setError("أدخل عدداً صحيحاً للمستفيدين أو الضيوف");
      return;
    }

    onSave({
      ...draft,
      deliveryAddress: delivery ? draft.deliveryAddress.trim() : "",
      deliveryFee: delivery ? Math.max(0, draft.deliveryFee) : 0,
      deliveryZone: delivery ? draft.deliveryZone.trim() : "",
      deliveryRecipientName: delivery
        ? draft.deliveryRecipientName.trim()
        : "",
      deliveryPhone: delivery ? draft.deliveryPhone.trim() : "",
      deliveryInstructions: delivery
        ? draft.deliveryInstructions.trim()
        : "",
      guestCount: Math.max(1, Math.floor(draft.guestCount)),
      notes: draft.notes.trim(),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(94dvh,100svh)] flex-col overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border/60">
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="size-5 text-gold-400" />
            نوع البيع وبيانات التنفيذ
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {availableModes.map(({ value: mode, label, description, icon: Icon }) => {
              const active = draft.mode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={active}
                  onClick={() => chooseMode(mode)}
                  className={cn(
                    "relative min-h-24 rounded-lg border p-3 text-start transition-[border-color,background-color,transform] active:scale-[0.98]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    active
                      ? "border-gold-400/50 bg-gold-400/10"
                      : "border-cacao-800/10 bg-card hover:border-cacao-800/20",
                  )}
                >
                  {active ? (
                    <span className="absolute end-2 top-2 flex size-5 items-center justify-center rounded-full bg-cacao-800 text-cream-50">
                      <Check className="size-3" />
                    </span>
                  ) : null}
                  <Icon
                    className={cn(
                      "mb-3 size-5",
                      active ? "text-gold-400" : "text-muted-foreground",
                    )}
                  />
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
                    {description}
                  </p>
                </button>
              );
            })}
          </div>

          {scheduled ? (
            <>
              <section className="space-y-3 rounded-lg bg-muted/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <UserRound className="size-4 shrink-0 text-gold-400" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {customer?.name ?? "لم يتم اختيار عميل"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground" dir="ltr">
                        {customer?.phone || "بيانات التواصل مطلوبة للطلبات المجدولة"}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onChooseCustomer(draft)}
                  >
                    {customer ? "تغيير" : "اختيار عميل"}
                  </Button>
                </div>
              </section>

              <section className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pos-scheduled-date">تاريخ التنفيذ</Label>
                    <Input
                      id="pos-scheduled-date"
                      type="date"
                      min={minDate}
                      value={draft.scheduledDate}
                      onChange={(event) =>
                        updateDraft({ scheduledDate: event.target.value })
                      }
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pos-scheduled-time">الوقت</Label>
                    <Input
                      id="pos-scheduled-time"
                      type="time"
                      value={draft.scheduledTime}
                      onChange={(event) =>
                        updateDraft({ scheduledTime: event.target.value })
                      }
                      dir="ltr"
                    />
                  </div>
                </div>

                {draft.mode !== "delivery" ? (
                  <div className="space-y-2">
                    <Label>طريقة الاستلام</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          {
                            value: "pickup" as PosFulfillmentMode,
                            label: "استلام من المتجر",
                            icon: ShoppingBag,
                          },
                          {
                            value: "delivery" as PosFulfillmentMode,
                            label: "توصيل للعميل",
                            icon: Truck,
                          },
                        ] as const
                      ).map(({ value: fulfillment, label, icon: Icon }) => (
                        <Button
                          key={fulfillment}
                          type="button"
                          variant={
                            draft.fulfillment === fulfillment
                              ? "default"
                              : "outline"
                          }
                          className="justify-start gap-2"
                          onClick={() =>
                            updateDraft({
                              fulfillment,
                              deliveryFee:
                                fulfillment === "delivery"
                                  ? settings.defaultDeliveryFee
                                  : draft.deliveryFee,
                            })
                          }
                        >
                          <Icon className="size-4" />
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {delivery ? (
                  <div className="space-y-4 rounded-xl border border-pistachio-400/20 bg-pistachio-400/[0.04] p-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="pos-delivery-recipient">
                          اسم المستلم
                        </Label>
                        <Input
                          id="pos-delivery-recipient"
                          value={draft.deliveryRecipientName}
                          onChange={(event) =>
                            updateDraft({
                              deliveryRecipientName: event.target.value,
                            })
                          }
                          placeholder={customer?.name ?? "اسم المستلم"}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pos-delivery-phone">
                          هاتف المستلم
                        </Label>
                        <Input
                          id="pos-delivery-phone"
                          dir="ltr"
                          className="text-start"
                          value={draft.deliveryPhone}
                          onChange={(event) =>
                            updateDraft({ deliveryPhone: event.target.value })
                          }
                          placeholder={customer?.phone ?? "+218..."}
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
                      <div className="space-y-2">
                        <Label>المنطقة</Label>
                        <DeliveryZoneSelect
                          value={
                            settings.deliveryZones.find(
                              (z) =>
                                z.id === draft.deliveryZone ||
                                z.name === draft.deliveryZone,
                            )?.id ?? ""
                          }
                          zones={settings.deliveryZones}
                          onChange={(zoneId, fee) => {
                            const zone = settings.deliveryZones.find(
                              (z) => z.id === zoneId,
                            );
                            updateDraft({
                              deliveryZone: zone?.name ?? zoneId,
                              deliveryFee: fee,
                            });
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pos-delivery-fee">سعر التوصيل</Label>
                        <Input
                          id="pos-delivery-fee"
                          type="number"
                          min={0}
                          step={0.5}
                          value={draft.deliveryFee}
                          onChange={(event) =>
                            updateDraft({
                              deliveryFee: Math.max(
                                0,
                                Number.parseFloat(event.target.value) || 0,
                              ),
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pos-delivery-address">عنوان التوصيل</Label>
                      <div className="relative">
                        <MapPin className="absolute start-3 top-3 size-4 text-muted-foreground" />
                        <Textarea
                          id="pos-delivery-address"
                          value={draft.deliveryAddress}
                          onChange={(event) =>
                            updateDraft({ deliveryAddress: event.target.value })
                          }
                          placeholder="الحي، الشارع، رقم المبنى وأقرب علامة"
                          className="min-h-20 ps-9"
                        />
                      </div>
                    </div>
                    <NotesComposer
                      id="pos-delivery-instructions"
                      label="تعليمات السائق والتسليم"
                      description="تظهر على الفاتورة وإيصال التوصيل."
                      value={draft.deliveryInstructions}
                      onChange={(value) =>
                        updateDraft({ deliveryInstructions: value })
                      }
                      placeholder="اتصل قبل الوصول، بوابة المنزل، وقت مناسب…"
                      suggestions={DELIVERY_NOTE_SUGGESTIONS}
                      rows={2}
                      className="border-pistachio-400/25 bg-white/60"
                    />
                    {settings.freeDeliveryThreshold !== null ? (
                      <p className="text-xs text-muted-foreground">
                        يصبح التوصيل مجانياً تلقائياً عند وصول الطلب إلى{" "}
                        <CurrencyDisplay amount={settings.freeDeliveryThreshold} />.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  {draft.mode === "event" ? (
                    <div className="space-y-2">
                      <Label>نوع المناسبة</Label>
                      <Select
                        value={draft.eventType}
                        onValueChange={(eventType) =>
                          updateDraft({ eventType: eventType as EventType })
                        }
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
                  ) : null}
                  <div className="space-y-2">
                    <Label htmlFor="pos-guest-count">
                      {draft.mode === "event" ? "عدد الضيوف" : "عدد المستفيدين"}
                    </Label>
                    <Input
                      id="pos-guest-count"
                      type="number"
                      min={1}
                      step={1}
                      value={draft.guestCount}
                      onChange={(event) =>
                        updateDraft({
                          guestCount: Number.parseInt(event.target.value, 10) || 1,
                        })
                      }
                      dir="ltr"
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <Banknote className="size-4 text-gold-400" />
                  <Label>خطة التحصيل</Label>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {PAYMENT_PLANS.map((plan) => (
                    <button
                      key={plan.value}
                      type="button"
                      aria-pressed={draft.paymentPlan === plan.value}
                      onClick={() => updateDraft({ paymentPlan: plan.value })}
                      className={cn(
                        "rounded-lg border p-3 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        draft.paymentPlan === plan.value
                          ? "border-gold-400/50 bg-gold-400/10"
                          : "border-cacao-800/10 hover:bg-muted/50",
                      )}
                    >
                      <p className="text-sm font-medium">{plan.label}</p>
                      <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                        {plan.description}
                      </p>
                    </button>
                  ))}
                </div>

                {draft.paymentPlan === "deposit" ? (
                  <div className="space-y-2">
                    <Label htmlFor="pos-deposit-amount">قيمة العربون</Label>
                    <Input
                      id="pos-deposit-amount"
                      type="number"
                      min={0}
                      max={total}
                      step="0.01"
                      value={draft.depositAmount || ""}
                      onChange={(event) =>
                        updateDraft({
                          depositAmount:
                            Number.parseFloat(event.target.value) || 0,
                        })
                      }
                      dir="ltr"
                      className="font-mono tabular-nums"
                    />
                  </div>
                ) : null}
              </section>

              <NotesComposer
                id="pos-order-notes"
                label={
                  draft.mode === "event"
                    ? "تعليمات التجهيز"
                    : "ملاحظات التنفيذ"
                }
                description="تُحفظ مع الطلب وتظهر في PDF والطباعة."
                value={draft.notes}
                onChange={(value) => updateDraft({ notes: value })}
                placeholder="تعليمات التغليف، حساسية، اسم المستلم، أو أي تفاصيل مهمة"
                suggestions={
                  draft.mode === "event"
                    ? PREP_NOTE_SUGGESTIONS
                    : POS_NOTE_SUGGESTIONS
                }
                rows={3}
              />
            </>
          ) : (
            <>
              <div className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">
                بيع مباشر من نقطة البيع، يُستكمل فور تحصيل المبلغ وتُحدّث
                الوردية تلقائياً.
              </div>
              <NotesComposer
                id="pos-walkin-notes"
                label="ملاحظات البيع"
                description="اختياري — يظهر على الفاتورة والإيصال."
                value={draft.notes}
                onChange={(value) => updateDraft({ notes: value })}
                placeholder="تغليف هدية، بدون مكسرات، طلب خاص…"
                suggestions={POS_NOTE_SUGGESTIONS}
                rows={2}
              />
            </>
          )}

          <div className="flex items-center justify-between rounded-lg border border-cacao-800/10 p-4">
            <div>
              <p className="text-xs text-muted-foreground">التحصيل الآن</p>
              <p className="text-sm">
                {scheduled && draft.paymentPlan === "later"
                  ? "سيُسجل كامل المبلغ كرصيد مستحق"
                  : scheduled && draft.paymentPlan === "deposit"
                    ? "العربون فقط، والباقي عند التنفيذ"
                    : "كامل قيمة الطلب"}
              </p>
            </div>
            <CurrencyDisplay
              amount={collectedNow}
              className="text-xl font-semibold"
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            إلغاء
          </Button>
          <Button
            type="button"
            className="min-h-11 w-full sm:w-auto"
            onClick={save}
          >
            حفظ نوع البيع
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
