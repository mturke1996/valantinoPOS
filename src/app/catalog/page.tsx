"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DeliveryZoneSelect } from "@/components/shared/delivery-zone-select";
import { DEFAULT_DELIVERY_ZONES } from "@/lib/constants/delivery-zones";

interface CatalogProduct {
  id: string;
  nameAr: string;
  retailPrice: number;
  imageUrl: string | null;
  categoryName: string | null;
}

interface CartLine {
  product: CatalogProduct;
  quantity: number;
}

export default function PublicCatalogPage() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [zones, setZones] = useState(DEFAULT_DELIVERY_ZONES);
  const [currency, setCurrency] = useState("د.ل");
  const [branchName, setBranchName] = useState("فالنتينو للشوكولاتة");
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [doneOrder, setDoneOrder] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await fetch("/api/public/catalog");
        const data = (await res.json()) as {
          products?: CatalogProduct[];
          zones?: typeof DEFAULT_DELIVERY_ZONES;
          currencySymbol?: string;
          branchName?: string;
          error?: string;
        };
        if (!active) return;
        if (!res.ok) throw new Error(data.error ?? "تعذر التحميل");
        setProducts(data.products ?? []);
        if (data.zones?.length) setZones(data.zones);
        if (data.currencySymbol) setCurrency(data.currencySymbol);
        if (data.branchName) setBranchName(data.branchName);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "تعذر فتح الكتالوج");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const subtotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.product.retailPrice * line.quantity, 0),
    [cart],
  );
  const total = subtotal + deliveryFee;

  const addProduct = (product: CatalogProduct) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        return prev.map((l) =>
          l.product.id === product.id
            ? { ...l, quantity: l.quantity + 1 }
            : l,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const submit = async () => {
    if (!name.trim() || !phone.trim()) {
      toast.error("الاسم ورقم الهاتف مطلوبان");
      return;
    }
    if (cart.length === 0) {
      toast.error("أضف أصنافاً إلى السلة");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name.trim(),
          customerPhone: phone.trim(),
          deliveryZone: zones.find((z) => z.id === zoneId)?.name ?? null,
          deliveryFee,
          deliveryAddress: address.trim() || null,
          notes: notes.trim() || null,
          items: cart.map((line) => ({
            productId: line.product.id,
            quantity: line.quantity,
          })),
        }),
      });
      const data = (await res.json()) as {
        orderNumber?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "فشل إرسال الطلب");
      setDoneOrder(data.orderNumber ?? "تم");
      setCart([]);
      toast.success("تم استلام طلبك — سنتواصل معك قريباً");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل الإرسال");
    } finally {
      setSubmitting(false);
    }
  };

  if (doneOrder) {
    return (
      <main className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center gap-4 bg-[#f7f3ec] px-6 text-center">
        <Image
          src="/images/valentino-logo.png"
          alt={branchName}
          width={120}
          height={120}
          className="object-contain"
        />
        <h1 className="text-2xl font-semibold text-[#3d2914]">شكراً لطلبك</h1>
        <p className="text-sm text-[#3d2914]/70">
          رقم الطلب <span className="font-mono font-semibold">{doneOrder}</span>
          — سيتواصل معك فريق فالنتينو عبر واتساب لتأكيد التفاصيل.
        </p>
        <Button onClick={() => setDoneOrder(null)}>طلب جديد</Button>
      </main>
    );
  }

  return (
    <main className="min-h-svh bg-[#f7f3ec] text-[#3d2914]">
      <header className="border-b border-[#3d2914]/10 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-4">
          <Image
            src="/images/valentino-logo.png"
            alt={branchName}
            width={56}
            height={56}
            className="object-contain"
          />
          <div>
            <h1 className="text-xl font-semibold">{branchName}</h1>
            <p className="text-sm text-[#3d2914]/65">اطلب شوكولاتة فاخرة أونلاين</p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">الأصناف</h2>
          {loading ? (
            <p className="text-sm text-[#3d2914]/60">جاري التحميل…</p>
          ) : products.length === 0 ? (
            <p className="text-sm text-[#3d2914]/60">لا توجد أصناف متاحة حالياً.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addProduct(product)}
                  className="flex gap-3 rounded-xl border border-[#3d2914]/10 bg-white p-3 text-start transition hover:border-[#c9a227]/50"
                >
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-[#3d2914]/5">
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.imageUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <ShoppingBag className="absolute inset-0 m-auto size-6 opacity-30" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{product.nameAr}</p>
                    {product.categoryName ? (
                      <p className="text-xs text-[#3d2914]/50">
                        {product.categoryName}
                      </p>
                    ) : null}
                    <p className="mt-1 font-mono text-sm tabular-nums">
                      {product.retailPrice.toFixed(2)} {currency}
                    </p>
                  </div>
                  <Plus className="size-4 shrink-0 self-center text-[#c9a227]" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="h-fit space-y-4 rounded-2xl border border-[#3d2914]/10 bg-white p-4 shadow-sm lg:sticky lg:top-4">
          <h2 className="text-lg font-semibold">سلة الطلب</h2>
          {cart.length === 0 ? (
            <p className="text-sm text-[#3d2914]/55">أضف أصنافاً من القائمة</p>
          ) : (
            <ul className="space-y-2">
              {cart.map((line) => (
                <li
                  key={line.product.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate">
                    {line.product.nameAr}
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    aria-label={`تقليل كمية ${line.product.nameAr}`}
                    onClick={() =>
                      setCart((prev) =>
                        prev
                          .map((l) =>
                            l.product.id === line.product.id
                              ? { ...l, quantity: l.quantity - 1 }
                              : l,
                          )
                          .filter((l) => l.quantity > 0),
                      )
                    }
                  >
                    <Minus className="size-3.5" aria-hidden />
                  </Button>
                  <span
                    className="w-6 text-center font-mono"
                    aria-label={`كمية ${line.product.nameAr}: ${line.quantity}`}
                  >
                    {line.quantity}
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    aria-label={`زيادة كمية ${line.product.nameAr}`}
                    onClick={() => addProduct(line.product)}
                  >
                    <Plus className="size-3.5" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8 text-destructive"
                    aria-label={`حذف ${line.product.nameAr}`}
                    onClick={() =>
                      setCart((prev) =>
                        prev.filter((l) => l.product.id !== line.product.id),
                      )
                    }
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-3 border-t border-[#3d2914]/10 pt-3">
            <div className="space-y-2">
              <Label htmlFor="catalog-name">الاسم</Label>
              <Input
                id="catalog-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="catalog-phone">الهاتف / واتساب</Label>
              <Input
                id="catalog-phone"
                dir="ltr"
                className="text-start"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09xxxxxxxx"
                autoComplete="tel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="catalog-zone">منطقة التوصيل</Label>
              <DeliveryZoneSelect
                id="catalog-zone"
                aria-label="منطقة التوصيل"
                value={zoneId}
                zones={zones}
                onChange={(id, fee) => {
                  setZoneId(id);
                  setDeliveryFee(fee);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="catalog-address">العنوان</Label>
              <Input
                id="catalog-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                autoComplete="street-address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="catalog-notes">ملاحظات</Label>
              <Textarea
                id="catalog-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>المجموع</span>
              <span className="font-mono">
                {subtotal.toFixed(2)} {currency}
              </span>
            </div>
            <div className="flex justify-between">
              <span>التوصيل</span>
              <span className="font-mono">
                {deliveryFee.toFixed(2)} {currency}
              </span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>الإجمالي</span>
              <span className="font-mono">
                {total.toFixed(2)} {currency}
              </span>
            </div>
          </div>

          <Button
            className="w-full"
            disabled={submitting}
            onClick={() => void submit()}
          >
            {submitting ? "جاري الإرسال…" : "تأكيد الطلب"}
          </Button>
        </section>
      </div>
    </main>
  );
}
