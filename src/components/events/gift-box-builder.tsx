"use client";

import { useEffect, useMemo, useState } from "react";
import { Gift, Plus, Trash2 } from "lucide-react";
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

  useEffect(() => {
    if (open) {
      setProducts(getProducts().filter((p) => p.isActive && !p.isBundle));
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
        notes: `علبة هدايا مخصصة — هامش ${formatMoneyLabel(totals.margin, settings)}`,
        createdBy: session?.userId ?? null,
        event: {
          eventType: "other",
          guestCount: 1,
          packagingColors: [],
          giftCardMessage: null,
          giftCardPhrase: null,
          specialNotes: "علبة هدايا مخصصة",
        },
      });
      toast.success(`تم تسجيل الطلب ${order.orderNumber}`);
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="size-5" />
            منشئ علب الهدايا
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>نوع العلبة</Label>
            <Select value={boxProductId} onValueChange={setBoxProductId}>
              <SelectTrigger>
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

          <div className="flex gap-2">
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger className="flex-1">
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
            <Button size="icon" onClick={addItem}>
              <Plus className="size-4" />
            </Button>
          </div>

          {items.length > 0 ? (
            <div className="space-y-2 rounded-lg border border-cacao-800/10 p-3">
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
                        className="size-7"
                        onClick={() =>
                          setItems((prev) =>
                            prev.filter((i) => i.productId !== item.productId),
                          )
                        }
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          <div className="rounded-lg bg-cacao-800/5 p-3 space-y-1 text-sm">
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
        </div>

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
