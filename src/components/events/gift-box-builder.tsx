"use client";

import { useEffect, useMemo, useState } from "react";
import { Gift, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { addDays, format } from "date-fns";

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
import { createOrder, getProducts, getSettings } from "@/lib/data/store";
import { getAuthSession } from "@/lib/auth";
import { formatMoneyLabel } from "@/lib/formatters";
import type { Product } from "@/types";

interface GiftBoxItem {
  productId: string;
  quantity: number;
}

interface GiftBoxBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function GiftBoxBuilder({
  open,
  onOpenChange,
  onSaved,
}: GiftBoxBuilderProps) {
  const [boxProductId, setBoxProductId] = useState("");
  const [items, setItems] = useState<GiftBoxItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [deliveryDate, setDeliveryDate] = useState(() =>
    format(addDays(new Date(), 1), "yyyy-MM-dd"),
  );
  const [deliveryTime, setDeliveryTime] = useState("12:00");
  const [giftMessage, setGiftMessage] = useState("");

  useEffect(() => {
    if (open) {
      setProducts(getProducts().filter((p) => p.isActive && !p.isBundle));
      setDeliveryDate(format(addDays(new Date(), 1), "yyyy-MM-dd"));
      setDeliveryTime("12:00");
      setGiftMessage("");
    }
  }, [open]);
  const boxProducts = products.filter((p) => p.unitType === "box");

  const totals = useMemo(() => {
    let cost = 0;
    let price = 0;
    const box = boxProducts.find((p) => p.id === boxProductId);
    if (box) {
      cost += box.costPrice;
      price += box.retailPrice;
    }
    for (const item of items) {
      const p = products.find((x) => x.id === item.productId);
      if (p) {
        cost += p.costPrice * item.quantity;
        price += p.retailPrice * item.quantity;
      }
    }
    return { cost, price, margin: price - cost };
  }, [boxProductId, items, products, boxProducts]);

  const addItem = () => {
    if (!selectedProduct) return;
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === selectedProduct);
      if (existing) {
        return prev.map((i) =>
          i.productId === selectedProduct
            ? { ...i, quantity: i.quantity + 1 }
            : i,
        );
      }
      return [...prev, { productId: selectedProduct, quantity: 1 }];
    });
    setSelectedProduct("");
  };

  const handleSave = () => {
    if (!boxProductId || items.length === 0) {
      toast.error("اختر العلبة وأضف منتجات");
      return;
    }
    if (!deliveryDate) {
      toast.error("حدد موعد التسليم لحفظ العلبة في التقويم");
      return;
    }
    const settings = getSettings();
    const session = getAuthSession();
    const orderItems = [
      { productId: boxProductId, quantity: 1 },
      ...items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    ];
    try {
      const order = createOrder({
        branchId: settings.branchId,
        type: "event",
        items: orderItems,
        deliveryDate,
        deliveryTime: deliveryTime || null,
        notes: `علبة هدايا مخصصة — هامش ${formatMoneyLabel(totals.margin, settings)}`,
        createdBy: session?.userId ?? null,
        event: {
          eventType: "gift",
          guestCount: 1,
          packagingColors: [],
          giftCardMessage: giftMessage.trim() || null,
          giftCardPhrase: null,
          specialNotes: "علبة هدايا مخصصة",
        },
      });
      toast.success(
        `تم تسجيل ${order.orderNumber} في المناسبات والتقويم مع تنبيه التجهيز`,
      );
      onSaved?.();
      onOpenChange(false);
      setBoxProductId("");
      setItems([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "فشل حفظ العلبة");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(94dvh,100svh)] flex-col overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-cacao-800/8">
          <DialogTitle className="flex items-center gap-2">
            <Gift className="size-5" />
            منشئ علب الهدايا
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="gift-box-type">نوع العلبة</Label>
            <Select value={boxProductId} onValueChange={setBoxProductId}>
              <SelectTrigger id="gift-box-type" aria-label="نوع العلبة">
                <SelectValue placeholder="اختر العلبة" />
              </SelectTrigger>
              <SelectContent>
                {boxProducts.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nameAr} —{" "}
                    <CurrencyDisplay
                      amount={p.retailPrice}
                      className="inline text-sm"
                    />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="gift-delivery-date">موعد التسليم</Label>
              <Input
                id="gift-delivery-date"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gift-delivery-time">الوقت</Label>
              <Input
                id="gift-delivery-time"
                type="time"
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gift-card-message">رسالة بطاقة الإهداء</Label>
            <Input
              id="gift-card-message"
              value={giftMessage}
              onChange={(e) => setGiftMessage(e.target.value)}
              placeholder="اختياري"
            />
          </div>

          <div className="flex gap-2">
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger className="flex-1" aria-label="إضافة منتج للعلبة">
                <SelectValue placeholder="إضافة منتج" />
              </SelectTrigger>
              <SelectContent>
                {products
                  .filter((p) => p.unitType !== "box")
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nameAr}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button
              size="icon"
              onClick={addItem}
              aria-label="إضافة المنتج للعلبة"
            >
              <Plus className="size-4" aria-hidden />
            </Button>
          </div>

          {items.length > 0 ? (
            <div className="max-h-48 space-y-2 overflow-y-auto overscroll-y-contain touch-pan-y rounded-lg border border-cacao-800/10 p-3 [-webkit-overflow-scrolling:touch]">
              {items.map((item) => {
                const p = products.find((x) => x.id === item.productId);
                if (!p) return null;
                return (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{p.nameAr}</span>
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums">×{item.quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 min-h-8 min-w-8"
                        aria-label={`حذف ${p.nameAr}`}
                        onClick={() =>
                          setItems((prev) =>
                            prev.filter((i) => i.productId !== item.productId),
                          )
                        }
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          <div className="space-y-1 rounded-lg bg-cacao-800/5 p-3 text-sm">
            <div className="flex justify-between">
              <span>التكلفة</span>
              <CurrencyDisplay amount={totals.cost} />
            </div>
            <div className="flex justify-between font-semibold">
              <span>سعر البيع</span>
              <CurrencyDisplay amount={totals.price} />
            </div>
            <div className="flex justify-between text-pistachio-400">
              <span>الهامش</span>
              <CurrencyDisplay amount={totals.margin} />
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={handleSave}>حفظ العلبة</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
