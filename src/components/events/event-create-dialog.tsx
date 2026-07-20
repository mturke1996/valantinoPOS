"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Gift,
  PackageCheck,
  PartyPopper,
  UserPlus,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";

import { CurrencyDisplay } from "@/components/shared/currency-display";
import {
  DELIVERY_NOTE_SUGGESTIONS,
  NotesComposer,
  PREP_NOTE_SUGGESTIONS,
} from "@/components/shared/notes-composer";
import { CartItemNoteField } from "@/components/pos/cart-item-note-field";
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
import { getAuthSession } from "@/lib/auth";
import {
  createCustomer,
  createOrder,
  getCustomers,
  getOpenShift,
  getSettings,
  getState,
  processPayment,
} from "@/lib/data/store";
import { calculateOrderTotals } from "@/lib/services/pricing.service";
import { cn } from "@/lib/utils";
import type { EventType, PaymentMethod } from "@/types";

const NEW_CUSTOMER_VALUE = "__new_customer__";

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

interface EventCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  initialDate?: string;
}

function minutesFromTime(value: string): number {
  const [hours = "0", minutes = "0"] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
}

export function EventCreateDialog({
  open,
  onOpenChange,
  onCreated,
  initialDate,
}: EventCreateDialogProps) {
  const state = getState();
  const activeProducts = state.products.filter(
    (product) => product.isActive && !product.deletedAt,
  );
  const defaultProduct =
    activeProducts.find((product) => product.unitType === "box") ??
    activeProducts[0] ??
    null;

  const [eventType, setEventType] = useState<EventType>("wedding");
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [guestCount, setGuestCount] = useState("50");
  const [productId, setProductId] = useState(defaultProduct?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState(
    defaultProduct ? String(defaultProduct.retailPrice) : "",
  );
  const [deliveryDate, setDeliveryDate] = useState(initialDate ?? "");
  const [deliveryTime, setDeliveryTime] = useState("18:00");
  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery">(
    "pickup",
  );
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryZone, setDeliveryZone] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("0");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [packagingColors, setPackagingColors] = useState<string[]>([]);
  const [deposit, setDeposit] = useState("");
  const [depositMethod, setDepositMethod] =
    useState<PaymentMethod>("cash");
  const [notes, setNotes] = useState("");
  const [itemNotes, setItemNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && initialDate) setDeliveryDate(initialDate);
  }, [initialDate, open]);

  const customers = getCustomers();
  const selectedProduct = activeProducts.find(
    (product) => product.id === productId,
  );
  const parsedQuantity = Math.max(0, Number.parseFloat(quantity) || 0);
  const parsedUnitPrice = Math.max(0, Number.parseFloat(unitPrice) || 0);
  const parsedDeliveryFee =
    fulfillment === "delivery"
      ? Math.max(0, Number.parseFloat(deliveryFee) || 0)
      : 0;
  const totals = useMemo(
    () =>
      calculateOrderTotals({
        items: [
          {
            quantity: parsedQuantity,
            unitPrice: parsedUnitPrice,
            discount: 0,
          },
        ],
        deliveryFee: parsedDeliveryFee,
        taxRate: state.settings.taxRate,
      }),
    [
      parsedDeliveryFee,
      parsedQuantity,
      parsedUnitPrice,
      state.settings.taxRate,
    ],
  );

  const scheduleConflicts = useMemo(() => {
    if (!deliveryDate || !deliveryTime) return [];
    const targetMinutes = minutesFromTime(deliveryTime);
    return state.orders.filter((order) => {
      if (
        order.deletedAt ||
        order.status === "cancelled" ||
        order.deliveryDate !== deliveryDate ||
        !order.deliveryTime
      ) {
        return false;
      }
      return Math.abs(minutesFromTime(order.deliveryTime) - targetMinutes) <= 60;
    });
  }, [deliveryDate, deliveryTime, state.orders]);

  const reset = () => {
    setEventType("wedding");
    setCustomerId("");
    setCustomerName("");
    setCustomerPhone("");
    setGuestCount("50");
    setProductId(defaultProduct?.id ?? "");
    setQuantity("1");
    setUnitPrice(defaultProduct ? String(defaultProduct.retailPrice) : "");
    setDeliveryDate(initialDate ?? "");
    setDeliveryTime("18:00");
    setFulfillment("pickup");
    setDeliveryAddress("");
    setDeliveryZone("");
    setDeliveryFee("0");
    setDeliveryInstructions("");
    setGiftMessage("");
    setPackagingColors([]);
    setDeposit("");
    setDepositMethod("cash");
    setNotes("");
    setItemNotes("");
  };

  const handleProductChange = (nextProductId: string) => {
    setProductId(nextProductId);
    const product = activeProducts.find((item) => item.id === nextProductId);
    if (product) setUnitPrice(String(product.retailPrice));
  };

  const togglePackagingColor = (color: string) => {
    setPackagingColors((current) =>
      current.includes(color)
        ? current.filter((item) => item !== color)
        : [...current, color],
    );
  };

  const handleSubmit = () => {
    if (!customerId) {
      toast.error("اختر العميل أو أنشئ عميلاً جديداً");
      return;
    }
    if (
      customerId === NEW_CUSTOMER_VALUE &&
      (customerName.trim().length < 2 ||
        !/^\+?\d{8,15}$/.test(customerPhone.replace(/\s+/g, "")))
    ) {
      toast.error("أدخل اسم العميل ورقم هاتف صحيح");
      return;
    }
    if (!selectedProduct || parsedQuantity <= 0 || parsedUnitPrice <= 0) {
      toast.error("حدد المنتج والكمية والسعر المتفق عليه");
      return;
    }
    if (!deliveryDate || !deliveryTime) {
      toast.error("حدد تاريخ ووقت التسليم");
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    if (deliveryDate < today) {
      toast.error("لا يمكن اختيار تاريخ سابق");
      return;
    }
    if (fulfillment === "delivery" && deliveryAddress.trim().length < 5) {
      toast.error("أدخل عنوان التوصيل");
      return;
    }

    const depositAmount = Math.max(0, Number.parseFloat(deposit) || 0);
    if (depositAmount > totals.total) {
      toast.error("العربون أكبر من إجمالي الطلب");
      return;
    }

    setSaving(true);
    try {
      const settings = getSettings();
      const session = getAuthSession();
      const currentState = getState();
      let resolvedCustomerId = customerId;

      if (customerId === NEW_CUSTOMER_VALUE) {
        const cleanPhone = customerPhone.replace(/\s+/g, "");
        if (
          currentState.customers.some(
            (customer) => customer.phone === cleanPhone && !customer.deletedAt,
          )
        ) {
          throw new Error("رقم الهاتف مسجل لعميل آخر");
        }
        const defaultTier =
          [...currentState.loyaltyTiers].sort(
            (a, b) => a.minPoints - b.minPoints,
          )[0] ?? null;
        if (!defaultTier) throw new Error("لا توجد فئة ولاء افتراضية");

        resolvedCustomerId = createCustomer({
          branchId: settings.branchId,
          name: customerName.trim(),
          phone: cleanPhone,
          whatsapp: cleanPhone,
          email: null,
          notes: null,
          birthday: null,
          loyaltyTierId: defaultTier.id,
          wholesalePricing: false,
        }).id;
      }
      const resolvedCustomer =
        customerId === NEW_CUSTOMER_VALUE
          ? { name: customerName.trim(), phone: customerPhone.replace(/\s+/g, "") }
          : currentState.customers.find(
              (customer) => customer.id === resolvedCustomerId,
            );

      const order = createOrder({
        branchId: settings.branchId,
        customerId: resolvedCustomerId,
        type: "event",
        items: [
          {
            productId: selectedProduct.id,
            quantity: parsedQuantity,
            unitPrice: parsedUnitPrice,
            notes: itemNotes.trim() || null,
          },
        ],
        deliveryDate,
        deliveryTime,
        deliveryAddress:
          fulfillment === "delivery"
            ? deliveryAddress.trim()
            : "استلام من المتجر",
        deliveryFee: parsedDeliveryFee,
        deliveryZone:
          fulfillment === "delivery" ? deliveryZone.trim() || null : null,
        deliveryRecipientName:
          fulfillment === "delivery" ? resolvedCustomer?.name ?? null : null,
        deliveryPhone:
          fulfillment === "delivery" ? resolvedCustomer?.phone ?? null : null,
        deliveryInstructions:
          fulfillment === "delivery"
            ? deliveryInstructions.trim() || null
            : null,
        notes: notes.trim() || null,
        createdBy: session?.userId ?? currentState.users[0]?.id,
        event: {
          eventType,
          guestCount: Math.max(1, Number.parseInt(guestCount, 10) || 1),
          packagingColors,
          giftCardMessage: giftMessage.trim() || null,
          giftCardPhrase: giftMessage.trim() || null,
          specialNotes: notes.trim() || null,
        },
      });

      if (depositAmount > 0) {
        const currentShift = getOpenShift(settings.branchId);
        processPayment({
          orderId: order.id,
          shiftId: currentShift?.id ?? null,
          method: depositMethod,
          amount: depositAmount,
          cashAmount: depositMethod === "cash" ? depositAmount : null,
          cardAmount: depositMethod === "card" ? depositAmount : null,
          userId: session?.userId ?? null,
        });
      }

      toast.success(`تم إنشاء حجز المناسبة ${order.orderNumber}`);
      reset();
      onCreated?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "فشل إنشاء المناسبة",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(94dvh,100svh)] flex-col overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-cacao-800/8 px-6 py-5">
          <DialogTitle className="flex items-center gap-2">
            <PartyPopper className="size-5 text-gold-400" />
            حجز مناسبة جديد
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-6 py-5">
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <UserPlus className="size-4 text-gold-400" />
              <h3 className="text-sm font-semibold">العميل والمناسبة</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>العميل</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر العميل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NEW_CUSTOMER_VALUE}>
                      + عميل جديد
                    </SelectItem>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} — {customer.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
            </div>

            {customerId === NEW_CUSTOMER_VALUE ? (
              <div className="grid gap-3 rounded-xl bg-cream-100/50 p-3 sm:grid-cols-2 dark:bg-cacao-800/15">
                <div className="space-y-2">
                  <Label htmlFor="event-customer-name">اسم العميل</Label>
                  <Input
                    id="event-customer-name"
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    placeholder="الاسم الكامل"
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-customer-phone">رقم الهاتف</Label>
                  <Input
                    id="event-customer-phone"
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                    placeholder="05xxxxxxxx"
                    inputMode="tel"
                    autoComplete="tel"
                    dir="ltr"
                  />
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="event-guests">عدد الضيوف أو القطع التقديري</Label>
              <Input
                id="event-guests"
                type="number"
                min="1"
                value={guestCount}
                onChange={(event) => setGuestCount(event.target.value)}
                dir="ltr"
              />
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <PackageCheck className="size-4 text-gold-400" />
              <h3 className="text-sm font-semibold">المنتج والسعر المتفق</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_110px_140px]">
              <div className="space-y-2">
                <Label>المنتج أو العلبة</Label>
                <Select value={productId} onValueChange={handleProductChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المنتج" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.nameAr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-quantity">الكمية</Label>
                <Input
                  id="event-quantity"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-unit-price">سعر الوحدة</Label>
                <Input
                  id="event-unit-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={unitPrice}
                  onChange={(event) => setUnitPrice(event.target.value)}
                  dir="ltr"
                />
              </div>
            </div>

            <CartItemNoteField
              value={itemNotes}
              onChange={setItemNotes}
              productName={selectedProduct?.nameAr ?? "المنتج"}
              pinned
            />
          </section>

          <Separator />

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <CalendarClock className="size-4 text-gold-400" />
              <h3 className="text-sm font-semibold">موعد وطريقة الاستلام</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="event-date">تاريخ التسليم</Label>
                <Input
                  id="event-date"
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  value={deliveryDate}
                  onChange={(event) => setDeliveryDate(event.target.value)}
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-time">وقت التسليم</Label>
                <Input
                  id="event-time"
                  type="time"
                  value={deliveryTime}
                  onChange={(event) => setDeliveryTime(event.target.value)}
                  dir="ltr"
                />
              </div>
            </div>

            {scheduleConflicts.length > 0 ? (
              <div className="rounded-lg border border-caramel-500/25 bg-caramel-500/10 px-3 py-2 text-xs text-cacao-800 dark:text-caramel-500">
                يوجد {scheduleConflicts.length} طلب قريب من هذا الموعد. راجع
                قدرة التجهيز قبل التأكيد.
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { value: "pickup" as const, label: "استلام من المتجر" },
                  { value: "delivery" as const, label: "توصيل للعميل" },
                ] as const
              ).map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={
                    fulfillment === option.value ? "default" : "outline"
                  }
                  onClick={() => {
                    setFulfillment(option.value);
                    setDeliveryFee(
                      option.value === "delivery"
                        ? String(getSettings().defaultDeliveryFee)
                        : "0",
                    );
                  }}
                >
                  {option.label}
                </Button>
              ))}
            </div>

            {fulfillment === "delivery" ? (
              <div className="space-y-4 rounded-xl border border-pistachio-400/20 bg-pistachio-400/[0.04] p-4">
                <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
                  <div className="space-y-2">
                    <Label htmlFor="event-delivery-zone">منطقة التوصيل</Label>
                    <Input
                      id="event-delivery-zone"
                      value={deliveryZone}
                      onChange={(event) => setDeliveryZone(event.target.value)}
                      placeholder="طرابلس المركز"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event-delivery-fee">سعر التوصيل</Label>
                    <Input
                      id="event-delivery-fee"
                      type="number"
                      min={0}
                      step={0.5}
                      value={deliveryFee}
                      onChange={(event) => setDeliveryFee(event.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-address">عنوان التوصيل</Label>
                  <Input
                    id="event-address"
                    value={deliveryAddress}
                    onChange={(event) => setDeliveryAddress(event.target.value)}
                    placeholder="المدينة، الحي، الشارع وأقرب علامة"
                  />
                </div>
                <NotesComposer
                  id="event-delivery-instructions"
                  label="تعليمات التسليم"
                  description="تظهر للسائق وعلى الفاتورة المطبوعة."
                  value={deliveryInstructions}
                  onChange={setDeliveryInstructions}
                  placeholder="اتصل قبل الوصول، بوابة المنزل، وقت مناسب…"
                  suggestions={DELIVERY_NOTE_SUGGESTIONS}
                  rows={2}
                />
              </div>
            ) : null}
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

            <NotesComposer
              id="event-gift-message"
              label="بطاقة الإهداء"
              description="العبارة التي ستُطبع على بطاقة الإهداء وتظهر في PDF."
              icon={Gift}
              value={giftMessage}
              onChange={setGiftMessage}
              placeholder="مبروك لكم… بكل الحب والفرح"
              suggestions={["مبروك الزواج", "عيد ميلاد سعيد", "بالتوفيق والنجاح"]}
              maxLength={220}
              rows={2}
            />
            <NotesComposer
              id="event-notes"
              label="تعليمات التجهيز"
              description="تظهر لفريق التجهيز وعلى الفاتورة — حساسية، توزيع، تغليف خاص."
              value={notes}
              onChange={setNotes}
              placeholder="تفاصيل التغليف، الحساسية، أو أي تعليمات خاصة للمطبخ"
              suggestions={PREP_NOTE_SUGGESTIONS}
              rows={3}
            />
          </section>

          <Separator />

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <WalletCards className="size-4 text-gold-400" />
              <h3 className="text-sm font-semibold">العربون</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                <Label htmlFor="event-deposit">المبلغ المدفوع الآن</Label>
                <Input
                  id="event-deposit"
                  type="number"
                  min="0"
                  max={totals.total}
                  step="0.01"
                  value={deposit}
                  onChange={(event) => setDeposit(event.target.value)}
                  placeholder="0.00"
                  dir="ltr"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 self-end">
                {(
                  [
                    { value: "cash" as const, label: "نقدي" },
                    { value: "card" as const, label: "بطاقة" },
                  ] as const
                ).map((method) => (
                  <Button
                    key={method.value}
                    type="button"
                    variant={
                      depositMethod === method.value ? "default" : "outline"
                    }
                    onClick={() => setDepositMethod(method.value)}
                  >
                    {method.label}
                  </Button>
                ))}
              </div>
            </div>
          </section>

          <div className="rounded-xl border border-gold-400/20 bg-gold-400/[0.06] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">إجمالي الحجز</p>
                <CurrencyDisplay
                  amount={totals.total}
                  className="mt-1 text-2xl font-semibold"
                />
              </div>
              <div className="text-end text-xs text-muted-foreground">
                <p>
                  قبل الضريبة{" "}
                  <CurrencyDisplay
                    amount={totals.subtotal}
                    className="inline text-xs"
                  />
                </p>
                <p>
                  الضريبة{" "}
                  <CurrencyDisplay
                    amount={totals.taxAmount}
                    className="inline text-xs"
                  />
                </p>
                {totals.deliveryFee > 0 ? (
                  <p>
                    التوصيل{" "}
                    <CurrencyDisplay
                      amount={totals.deliveryFee}
                      className="inline text-xs"
                    />
                  </p>
                ) : null}
              </div>
            </div>
            {Number.parseFloat(deposit) > 0 ? (
              <div className="mt-3 flex items-center justify-between border-t border-gold-400/15 pt-3 text-sm">
                <span>المتبقي عند التسليم</span>
                <CurrencyDisplay
                  amount={Math.max(
                    0,
                    totals.total - (Number.parseFloat(deposit) || 0),
                  )}
                  className="font-semibold"
                />
              </div>
            ) : null}
          </div>
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
            {saving ? "جاري الحفظ..." : "تأكيد الحجز"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
