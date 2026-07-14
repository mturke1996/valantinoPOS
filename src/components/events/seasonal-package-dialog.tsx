"use client";

import { useEffect, useMemo, useState } from "react";
import { Gift, Package, WalletCards } from "lucide-react";
import { toast } from "sonner";

import { CurrencyDisplay } from "@/components/shared/currency-display";
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
import { getAuthSession } from "@/lib/auth";
import {
  PACKAGE_SEASON_LABELS,
  SEASONAL_PACKAGES,
  packageSuggestedDeposit,
  packageTotal,
  type PackageSeason,
  type SeasonalPackage,
} from "@/lib/catalog/seasonal-packages";
import {
  createCategory,
  createCustomer,
  createOrder,
  createProduct,
  getCategories,
  getCustomers,
  getOpenShift,
  getProducts,
  getSettings,
  getState,
  processPayment,
} from "@/lib/data/store";
import { cn } from "@/lib/utils";
import type { PaymentMethod, Product, UnitType } from "@/types";

const NEW_CUSTOMER_VALUE = "__new_customer__";
const SEASONS = Object.keys(PACKAGE_SEASON_LABELS) as PackageSeason[];

interface SeasonalPackageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

/**
 * createOrder requires real catalog products. Resolve each package line by
 * matching nameAr, or create a trackStock:false product under «باقات موسمية».
 */
function resolvePackageProducts(pkg: SeasonalPackage): Array<{
  productId: string;
  quantity: number;
  unitPrice: number;
}> {
  const settings = getSettings();
  const products = getProducts();
  let categories = getCategories();

  let packageCategory = categories.find(
    (c) =>
      c.branchId === settings.branchId &&
      (c.nameAr === "باقات موسمية" || c.slug === "seasonal-packages"),
  );

  if (!packageCategory) {
    packageCategory = createCategory({
      branchId: settings.branchId,
      parentId: null,
      nameAr: "باقات موسمية",
      nameEn: "Seasonal Packages",
      slug: "seasonal-packages",
      sortOrder: 90,
    });
    categories = getCategories();
  }

  return pkg.items.map((item, index) => {
    const existing =
      products.find(
        (p) =>
          p.branchId === settings.branchId &&
          p.nameAr === item.nameAr &&
          p.isActive,
      ) ?? null;

    let product: Product;
    if (existing) {
      product = existing;
    } else {
      const sku = `PKG-${pkg.id}-${index + 1}`
        .toUpperCase()
        .replace(/[^A-Z0-9-]/g, "")
        .slice(0, 24);
      const unitType: UnitType = "piece";
      product = createProduct({
        branchId: settings.branchId,
        categoryId: packageCategory!.id,
        sku,
        barcode: "",
        nameAr: item.nameAr,
        nameEn: null,
        description: `من باقة: ${pkg.nameAr}`,
        costPrice: Math.max(0, item.unitPrice * 0.5),
        retailPrice: item.unitPrice,
        wholesalePrice: item.unitPrice,
        unitType,
        weightGrams: null,
        origin: "Valentino",
        minStock: 0,
        isBundle: false,
        isActive: true,
        trackStock: false,
      });
    }

    return {
      productId: product.id,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    };
  });
}

export function SeasonalPackageDialog({
  open,
  onOpenChange,
  onCreated,
}: SeasonalPackageDialogProps) {
  const [season, setSeason] = useState<PackageSeason>("ramadan");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deposit, setDeposit] = useState("");
  const [depositMethod, setDepositMethod] = useState<PaymentMethod>("cash");
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState(() => getCustomers());

  useEffect(() => {
    if (!open) return;
    setCustomers(getCustomers());
    setSeason("ramadan");
    setSelectedId(null);
    setCustomerId("");
    setCustomerName("");
    setCustomerPhone("");
    setDeliveryDate("");
    setDeposit("");
    setDepositMethod("cash");
  }, [open]);

  const packages = useMemo(
    () => SEASONAL_PACKAGES.filter((pkg) => pkg.season === season),
    [season],
  );

  const selected = useMemo(
    () => SEASONAL_PACKAGES.find((pkg) => pkg.id === selectedId) ?? null,
    [selectedId],
  );

  useEffect(() => {
    if (!selected) {
      setDeposit("");
      return;
    }
    setDeposit(String(packageSuggestedDeposit(selected)));
  }, [selected]);

  const selectPackage = (pkg: SeasonalPackage) => {
    setSelectedId(pkg.id);
  };

  const handleCreate = () => {
    if (!selected) {
      toast.error("اختر باقة أولاً");
      return;
    }
    if (!customerId) {
      toast.error("اختر عميلاً أو أضف عميلاً جديداً");
      return;
    }
    if (customerId === NEW_CUSTOMER_VALUE) {
      if (customerName.trim().length < 2) {
        toast.error("اسم العميل مطلوب");
        return;
      }
      if (customerPhone.replace(/\s+/g, "").length < 8) {
        toast.error("رقم الهاتف غير صالح");
        return;
      }
    }
    if (!deliveryDate) {
      toast.error("حدد تاريخ التسليم");
      return;
    }

    const depositAmount = Number(deposit);
    if (!Number.isFinite(depositAmount) || depositAmount < 0) {
      toast.error("مبلغ العربون غير صالح");
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

      const items = resolvePackageProducts(selected);
      const eventType =
        selected.season === "wedding"
          ? "wedding"
          : selected.season === "corporate"
            ? "corporate"
            : selected.season === "eid"
              ? "gift"
              : "other";

      const order = createOrder({
        branchId: settings.branchId,
        customerId: resolvedCustomerId,
        type: "event",
        items,
        deliveryDate,
        deliveryTime: "18:00",
        deliveryAddress: "استلام من المتجر",
        notes: `باقة موسمية: ${selected.nameAr}`,
        createdBy: session?.userId ?? currentState.users[0]?.id,
        event: {
          eventType,
          guestCount: Math.max(
            1,
            selected.items.reduce((sum, item) => sum + item.quantity, 0),
          ),
          packagingColors: [],
          giftCardMessage: null,
          giftCardPhrase: null,
          specialNotes: selected.description,
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

      toast.success(`تم إنشاء طلب الباقة ${order.orderNumber}`);
      onCreated?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "فشل إنشاء طلب الباقة",
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
            <Gift className="size-5 text-gold-400" />
            باقات موسمية
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-5 py-5">
          <div className="flex flex-wrap gap-1.5">
            {SEASONS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSeason(key);
                  setSelectedId(null);
                }}
                className={cn(
                  "rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  season === key
                    ? "bg-cacao-800 text-cream-50"
                    : "bg-muted/70 text-muted-foreground hover:bg-muted",
                )}
              >
                {PACKAGE_SEASON_LABELS[key]}
              </button>
            ))}
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {packages.map((pkg) => {
              const total = packageTotal(pkg);
              const active = selectedId === pkg.id;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => selectPackage(pkg)}
                  className={cn(
                    "rounded-xl border p-3.5 text-start transition-colors",
                    active
                      ? "border-gold-400 bg-gold-400/10"
                      : "border-cacao-800/10 bg-white hover:border-cacao-800/20",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-cacao-800">{pkg.nameAr}</p>
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      <CurrencyDisplay amount={total} className="text-[10px]" />
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {pkg.description}
                  </p>
                  <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Package className="size-3" />
                    {pkg.items.length} أصناف · عربون مقترح{" "}
                    <CurrencyDisplay
                      amount={packageSuggestedDeposit(pkg)}
                      className="inline text-[11px]"
                    />
                  </p>
                </button>
              );
            })}
          </div>

          {selected ? (
            <section className="space-y-3 rounded-xl border border-cacao-800/10 bg-cream-50/50 p-4">
              <div className="flex items-center gap-2">
                <WalletCards className="size-4 text-gold-400" />
                <h3 className="text-sm font-semibold">تفاصيل الطلب</h3>
              </div>

              <ul className="space-y-1 text-xs text-muted-foreground">
                {selected.items.map((item) => (
                  <li key={item.nameAr} className="flex justify-between gap-2">
                    <span>
                      {item.nameAr} × {item.quantity}
                    </span>
                    <CurrencyDisplay
                      amount={item.quantity * item.unitPrice}
                      className="text-xs"
                    />
                  </li>
                ))}
              </ul>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
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

                {customerId === NEW_CUSTOMER_VALUE ? (
                  <>
                    <div className="space-y-2">
                      <Label>الاسم</Label>
                      <Input
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="اسم العميل"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>الهاتف</Label>
                      <Input
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="09xxxxxxxx"
                        dir="ltr"
                        className="text-start"
                      />
                    </div>
                  </>
                ) : null}

                <div className="space-y-2">
                  <Label>تاريخ التسليم</Label>
                  <Input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>العربون</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={deposit}
                    onChange={(e) => setDeposit(e.target.value)}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>طريقة دفع العربون</Label>
                  <Select
                    value={depositMethod}
                    onValueChange={(v) =>
                      setDepositMethod(v as PaymentMethod)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">نقدي</SelectItem>
                      <SelectItem value="card">بطاقة</SelectItem>
                      <SelectItem value="transfer">تحويل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>
          ) : null}
        </DialogBody>

        <DialogFooter className="border-t border-cacao-800/8 px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button disabled={saving || !selected} onClick={handleCreate}>
            {saving ? "جاري الإنشاء…" : "إنشاء طلب الباقة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
