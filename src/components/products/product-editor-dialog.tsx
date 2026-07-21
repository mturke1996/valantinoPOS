"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Barcode,
  Calculator,
  PackagePlus,
  RefreshCw,
  Ruler,
  Save,
  Tag,
} from "lucide-react";
import { toast } from "sonner";

import { ImageUploadField } from "@/components/shared/image-upload-field";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  createProduct,
  getState,
  updateProduct,
} from "@/lib/data/store";
import { cacheProducts } from "@/lib/offline/db";
import type { Category, Product, UnitType } from "@/types";
import { LIBYA_LOCALE } from "@/lib/constants/locale";
import {
  cn,
  formatNumber,
  parseLocalizedNumber,
  roundMoney,
} from "@/lib/utils";

const UNIT_OPTIONS: Array<{ value: UnitType; label: string }> = [
  { value: "piece", label: "حبة" },
  { value: "gram", label: "100 غرام" },
  { value: "kilo", label: "كيلو" },
  { value: "box", label: "علبة" },
  { value: "carton", label: "كرتون" },
];

interface ProductFormState {
  nameAr: string;
  nameEn: string;
  sku: string;
  barcode: string;
  categoryId: string;
  description: string;
  costPrice: string;
  retailPrice: string;
  wholesalePrice: string;
  unitType: UnitType;
  weightGrams: string;
  origin: string;
  isBundle: boolean;
  isActive: boolean;
  imageUrl: string | null;
}

const EMPTY_FORM: ProductFormState = {
  nameAr: "",
  nameEn: "",
  sku: "",
  barcode: "",
  categoryId: "",
  description: "",
  costPrice: "",
  retailPrice: "",
  wholesalePrice: "",
  unitType: "piece",
  weightGrams: "",
  origin: "ليبيا",
  isBundle: false,
  isActive: true,
  imageUrl: null,
};

function formatPriceInput(value: number): string {
  if (!Number.isFinite(value)) return "";
  return formatNumber(value, LIBYA_LOCALE.locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function productToForm(product: Product | null): ProductFormState {
  if (!product) return { ...EMPTY_FORM };
  return {
    nameAr: product.nameAr,
    nameEn: product.nameEn ?? "",
    sku: product.sku,
    barcode: product.barcode,
    categoryId: product.categoryId,
    description: product.description,
    costPrice: formatPriceInput(product.costPrice),
    retailPrice: formatPriceInput(product.retailPrice),
    wholesalePrice: formatPriceInput(product.wholesalePrice),
    unitType: product.unitType,
    weightGrams:
      product.weightGrams === null ? "" : String(product.weightGrams),
    origin: product.origin,
    isBundle: product.isBundle,
    isActive: product.isActive,
    imageUrl: product.imageUrl ?? null,
  };
}

function numberValue(value: string): number {
  return parseLocalizedNumber(value) ?? 0;
}

function sanitizePriceInput(raw: string): string {
  return raw.replace(/[^\d,.\s\u0660-\u0669-]/g, "");
}

function normalizePriceInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const parsed = parseLocalizedNumber(trimmed);
  if (parsed === null) return trimmed;
  return formatPriceInput(parsed);
}

interface ProductEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  categories: Category[];
  onSaved: (product: Product) => void;
  onAddCategory: () => void;
  autoSelectCategoryId?: string | null;
  onAutoSelectCategoryHandled?: () => void;
}

export function ProductEditorDialog({
  open,
  onOpenChange,
  product,
  categories,
  onSaved,
  onAddCategory,
  autoSelectCategoryId,
  onAutoSelectCategoryHandled,
}: ProductEditorDialogProps) {
  const [form, setForm] = useState<ProductFormState>(() =>
    productToForm(product),
  );
  const [saving, setSaving] = useState(false);
  const editing = Boolean(product);
  const cost = numberValue(form.costPrice);
  const retail = numberValue(form.retailPrice);
  const margin = roundMoney(retail - cost);
  const marginPercent =
    retail > 0 ? Math.round(((retail - cost) / retail) * 1000) / 10 : 0;
  const hasPriceWarning = retail > 0 && cost > retail;

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
    [categories],
  );

  useEffect(() => {
    if (!open) return;
    setForm(productToForm(product));
    setSaving(false);
  }, [open, product]);

  useEffect(() => {
    if (!open || !autoSelectCategoryId) return;
    setForm((current) => ({ ...current, categoryId: autoSelectCategoryId }));
    onAutoSelectCategoryHandled?.();
  }, [autoSelectCategoryId, onAutoSelectCategoryHandled, open]);

  const updateForm = <Key extends keyof ProductFormState>(
    key: Key,
    value: ProductFormState[Key],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const generateSku = () => {
    const compactName = form.nameEn
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "")
      .slice(0, 4);
    const suffix = Date.now().toString().slice(-6);
    updateForm("sku", `VAL-${compactName || "CHO"}-${suffix}`);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.nameAr.trim()) {
      toast.error("أدخل اسم الصنف بالعربية");
      return;
    }
    if (!form.sku.trim()) {
      toast.error("أدخل رمز SKU");
      return;
    }
    if (!form.categoryId) {
      toast.error("اختر فئة للصنف أو أنشئ فئة جديدة");
      return;
    }
    if (retail <= 0) {
      toast.error("أدخل سعر البيع");
      return;
    }

    setSaving(true);
    try {
      const state = getState();
      const payload = {
        branchId: state.settings.branchId,
        categoryId: form.categoryId,
        sku: form.sku,
        barcode: form.barcode,
        nameAr: form.nameAr,
        nameEn: form.nameEn || null,
        description: form.description,
        costPrice: cost,
        retailPrice: retail,
        wholesalePrice: numberValue(form.wholesalePrice),
        unitType: form.unitType,
        weightGrams: form.weightGrams
          ? numberValue(form.weightGrams)
          : null,
        origin: form.origin,
        minStock: 0,
        isBundle: form.isBundle,
        isActive: form.isActive,
        trackStock: false,
        imageUrl: form.imageUrl,
      };

      const saved = product
        ? updateProduct(product.id, payload)
        : createProduct(payload);
      if (!saved) throw new Error("تعذر العثور على الصنف");

      const refreshed =
        getState().products.find((candidate) => candidate.id === saved.id) ??
        saved;
      await cacheProducts(
        getState().products.filter((candidate) => candidate.isActive),
      );
      toast.success(
        product
          ? "تم تحديث الصنف وربطه بنقطة البيع"
          : "تمت إضافة الصنف للكتالوج",
      );
      onSaved(refreshed);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر حفظ الصنف");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(94dvh,100svh)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader className="shrink-0 border-b border-cacao-800/10 px-4 py-4 sm:px-6 sm:py-5">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <PackagePlus className="size-5 shrink-0 text-gold-400" />
              <span className="truncate">
                {editing ? `تعديل ${product?.nameAr}` : "إضافة صنف جديد"}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 [-webkit-overflow-scrolling:touch] sm:px-6 sm:py-6">
            <div className="space-y-7 pb-2">
              <section className="space-y-4">
                <ImageUploadField
                  value={form.imageUrl}
                  onChange={(url) => updateForm("imageUrl", url)}
                  uploadName={form.sku || "valentino-product"}
                  previewAlt={form.nameAr || "معاينة المنتج"}
                  disabled={saving}
                />
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <Tag className="size-4 text-gold-400" />
                  <h3 className="text-sm font-semibold">هوية الصنف</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="product-name-ar">الاسم العربي *</Label>
                    <Input
                      id="product-name-ar"
                      value={form.nameAr}
                      onChange={(event) =>
                        updateForm("nameAr", event.target.value)
                      }
                      autoFocus
                      placeholder="مثال: علبة شوكولاتة بلجيكية"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="product-name-en">الاسم الإنجليزي</Label>
                    <Input
                      id="product-name-en"
                      value={form.nameEn}
                      onChange={(event) =>
                        updateForm("nameEn", event.target.value)
                      }
                      dir="ltr"
                      placeholder="Belgian Chocolate Box"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="product-sku">SKU *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="product-sku"
                        value={form.sku}
                        onChange={(event) =>
                          updateForm("sku", event.target.value)
                        }
                        dir="ltr"
                        className="font-mono"
                        placeholder="VAL-CHO-001"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                        onClick={generateSku}
                        aria-label="توليد رمز SKU"
                      >
                        <RefreshCw className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="product-barcode">الباركود</Label>
                    <div className="relative">
                      <Barcode className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="product-barcode"
                        value={form.barcode}
                        onChange={(event) =>
                          updateForm("barcode", event.target.value)
                        }
                        dir="ltr"
                        inputMode="numeric"
                        className="ps-9 font-mono"
                        placeholder="628xxxxxxxxxx"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div className="space-y-2">
                    <Label>الفئة *</Label>
                    <Select
                      value={form.categoryId || undefined}
                      onValueChange={(value) =>
                        updateForm("categoryId", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر فئة" />
                      </SelectTrigger>
                      <SelectContent>
                        {sortedCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.nameAr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {sortedCategories.length === 0 ? (
                      <p className="text-xs text-caramel-500">
                        لا توجد فئات — أنشئ فئة أولاً
                      </p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={onAddCategory}
                  >
                    فئة جديدة
                  </Button>
                </div>
              </section>

              <section className="space-y-4 border-t border-cacao-800/10 pt-6">
                <div className="flex items-center gap-2">
                  <Calculator className="size-4 text-gold-400" />
                  <h3 className="text-sm font-semibold">التسعير والهامش</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    {
                      id: "product-cost",
                      label: "سعر التكلفة",
                      key: "costPrice" as const,
                    },
                    {
                      id: "product-retail",
                      label: "سعر البيع *",
                      key: "retailPrice" as const,
                    },
                    {
                      id: "product-wholesale",
                      label: "سعر الجملة",
                      key: "wholesalePrice" as const,
                    },
                  ].map((field) => (
                    <div key={field.id} className="space-y-2">
                      <Label htmlFor={field.id}>{field.label}</Label>
                      <Input
                        id={field.id}
                        type="text"
                        value={form[field.key]}
                        onChange={(event) =>
                          updateForm(
                            field.key,
                            sanitizePriceInput(event.target.value),
                          )
                        }
                        onBlur={(event) =>
                          updateForm(
                            field.key,
                            normalizePriceInput(event.target.value),
                          )
                        }
                        dir="ltr"
                        className="font-mono text-base tabular-nums"
                        inputMode="decimal"
                        placeholder="0"
                        autoComplete="off"
                      />
                    </div>
                  ))}
                </div>

                <div
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-3 rounded-lg p-4",
                    hasPriceWarning
                      ? "bg-destructive/10 text-destructive"
                      : "bg-pistachio-400/10",
                  )}
                >
                  <div>
                    <p className="text-xs opacity-75">هامش البيع بالتجزئة</p>
                    <div className="mt-1 flex items-baseline gap-2">
                      <CurrencyDisplay amount={margin} className="font-semibold" />
                      <span className="font-mono text-xs tabular-nums">
                        {marginPercent}%
                      </span>
                    </div>
                  </div>
                  <p className="text-xs">
                    {hasPriceWarning
                      ? "سعر التكلفة أعلى من سعر البيع"
                      : "يُحسب قبل الضريبة والخصومات"}
                  </p>
                </div>
              </section>

              <section className="space-y-4 border-t border-cacao-800/10 pt-6">
                <div className="flex items-center gap-2">
                  <Ruler className="size-4 text-gold-400" />
                  <h3 className="text-sm font-semibold">الوحدة والمنشأ</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>وحدة البيع</Label>
                    <Select
                      value={form.unitType}
                      onValueChange={(value) =>
                        updateForm("unitType", value as UnitType)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIT_OPTIONS.map((unit) => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="product-weight">الوزن المرجعي (غرام)</Label>
                    <Input
                      id="product-weight"
                      type="number"
                      min={0}
                      step="0.001"
                      value={form.weightGrams}
                      onChange={(event) =>
                        updateForm("weightGrams", event.target.value)
                      }
                      dir="ltr"
                      inputMode="decimal"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="product-origin">المنشأ</Label>
                    <Input
                      id="product-origin"
                      value={form.origin}
                      onChange={(event) =>
                        updateForm("origin", event.target.value)
                      }
                      placeholder="ليبيا، بلجيكا..."
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-lg border border-cacao-800/10 p-3">
                  <div className="min-w-0">
                    <Label htmlFor="product-bundle">صنف مركّب / بوكس</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      مناسب لعلب الهدايا والتجميعات
                    </p>
                  </div>
                  <Switch
                    id="product-bundle"
                    checked={form.isBundle}
                    onCheckedChange={(checked) =>
                      updateForm("isBundle", checked)
                    }
                  />
                </div>

                {editing ? (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-cacao-800/10 p-3">
                    <div>
                      <Label htmlFor="product-active">متاح للبيع</Label>
                      <p className="mt-1 text-xs text-muted-foreground">
                        إيقافه يخفيه من نقطة البيع دون حذف سجلاته
                      </p>
                    </div>
                    <Switch
                      id="product-active"
                      checked={form.isActive}
                      onCheckedChange={(checked) =>
                        updateForm("isActive", checked)
                      }
                    />
                  </div>
                ) : null}
              </section>

              <section className="space-y-2 border-t border-cacao-800/10 pt-6">
                <Label htmlFor="product-description">وصف الصنف</Label>
                <Textarea
                  id="product-description"
                  value={form.description}
                  onChange={(event) =>
                    updateForm("description", event.target.value)
                  }
                  placeholder="المكونات، النكهة، الحساسية أو تعليمات العرض"
                  className="min-h-24"
                />
              </section>
            </div>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-cacao-800/10 bg-card px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => onOpenChange(false)}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="w-full gap-2 sm:w-auto"
            >
              <Save className="size-4" />
              {saving ? "جاري الحفظ..." : editing ? "حفظ التعديلات" : "إضافة الصنف"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
