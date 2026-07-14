"use client";

import {
  useCallback,
  useDeferredValue,
  useMemo,
  useState,
} from "react";
import {
  AlertTriangle,
  Boxes,
  FileUp,
  FolderPlus,
  PackagePlus,
  Pencil,
  Search,
  Sparkles,
  Tag,
} from "lucide-react";

import { CategoryCreateDialog } from "@/components/products/category-create-dialog";
import { ProductEditorDialog } from "@/components/products/product-editor-dialog";
import { ProductImportDialog } from "@/components/products/product-import-dialog";
import { ProductImage } from "@/components/shared/product-image";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStoreSubscription } from "@/hooks/use-store-subscription";
import { getCategories, getProducts } from "@/lib/data/store";
import { cacheProducts } from "@/lib/offline/db";
import { isStockTracked } from "@/lib/product-stock";
import type { Category, Product } from "@/types";
import { cn, formatNumber, roundMoney } from "@/lib/utils";

const ALL_CATEGORIES = "__all_categories__";
type StockFilter = "all" | "available" | "low" | "out" | "inactive";

function stockStatus(product: Product) {
  if (!isStockTracked(product)) return "not_tracked" as const;
  if (product.stockQuantity <= 0) return "out_of_stock" as const;
  if (product.stockQuantity <= product.minStock) return "low_stock" as const;
  return "in_stock" as const;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [autoSelectCategoryId, setAutoSelectCategoryId] = useState<string | null>(
    null,
  );
  const deferredSearch = useDeferredValue(search);

  const loadCatalog = useCallback(async () => {
    const liveProducts = getProducts();
    const liveCategories = getCategories();
    setProducts(liveProducts);
    setCategories(liveCategories);
    await cacheProducts(liveProducts.filter((product) => product.isActive));
    setLoading(false);
  }, []);

  useStoreSubscription(() => {
    void loadCatalog();
  });

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category.nameAr])),
    [categories],
  );

  const metrics = useMemo(() => {
    const active = products.filter((product) => product.isActive).length;
    const lowStock = products.filter(
      (product) =>
        product.isActive && product.stockQuantity <= product.minStock,
    ).length;
    const inventoryValue = roundMoney(
      products.reduce(
        (sum, product) => sum + product.costPrice * product.stockQuantity,
        0,
      ),
    );
    const bundles = products.filter((product) => product.isBundle).length;
    return { active, lowStock, inventoryValue, bundles };
  }, [products]);

  const filtered = useMemo(() => {
    const query = deferredSearch.trim().toLocaleLowerCase("ar");
    return [...products]
      .filter((product) => {
        const matchesSearch =
          !query ||
          product.nameAr.toLocaleLowerCase("ar").includes(query) ||
          product.nameEn?.toLocaleLowerCase("en").includes(query) ||
          product.sku.toLocaleLowerCase("en").includes(query) ||
          product.barcode.includes(query);
        if (!matchesSearch) return false;
        if (
          categoryFilter !== ALL_CATEGORIES &&
          product.categoryId !== categoryFilter
        ) {
          return false;
        }
        if (stockFilter === "available") {
          return product.isActive && product.stockQuantity > product.minStock;
        }
        if (stockFilter === "low") {
          return (
            product.isActive &&
            product.stockQuantity > 0 &&
            product.stockQuantity <= product.minStock
          );
        }
        if (stockFilter === "out") {
          return product.isActive && product.stockQuantity <= 0;
        }
        if (stockFilter === "inactive") return !product.isActive;
        return true;
      })
      .sort((left, right) => {
        if (left.isActive !== right.isActive) return left.isActive ? -1 : 1;
        return left.nameAr.localeCompare(right.nameAr, "ar");
      });
  }, [categoryFilter, deferredSearch, products, stockFilter]);

  const openCreate = () => {
    if (categories.length === 0) {
      setCategoryOpen(true);
      return;
    }
    setSelectedProduct(null);
    setEditorOpen(true);
  };

  const openEdit = (product: Product) => {
    setSelectedProduct(product);
    setEditorOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-44" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      <PageHeader
        title="كتالوج الأصناف"
        description="إضافة وتسعير وتصنيف الأصناف وربط الرصيد الافتتاحي والصلاحية"
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              variant="outline"
              className="w-full gap-2 sm:w-auto"
              onClick={() => setImportOpen(true)}
            >
              <FileUp className="size-4" />
              استيراد Excel
            </Button>
            <Button
              variant="outline"
              className="w-full gap-2 sm:w-auto"
              onClick={() => setCategoryOpen(true)}
            >
              <FolderPlus className="size-4" />
              فئة جديدة
            </Button>
            <Button className="w-full gap-2 sm:w-auto" onClick={openCreate}>
              <PackagePlus className="size-4" />
              إضافة صنف
            </Button>
          </div>
        }
      />

      <section className="grid grid-cols-2 overflow-hidden rounded-xl border border-cacao-800/10 bg-card sm:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="col-span-2 bg-cacao-800 p-5 text-cream-50 sm:col-span-1">
          <div className="flex items-center gap-2 text-xs text-cream-100/70">
            <Tag className="size-4 text-gold-400" />
            الكتالوج النشط
          </div>
          <p className="mt-3 font-mono text-4xl font-semibold tabular-nums">
            {formatNumber(metrics.active)}
          </p>
          <p className="mt-1 text-xs text-cream-100/60">
            من أصل {formatNumber(products.length)} صنف محفوظ
          </p>
        </div>

        <div className="border-b border-cacao-800/10 p-5 sm:border-b-0 sm:border-s">
          <AlertTriangle className="mb-3 size-4 text-caramel-500" />
          <p className="text-xs text-muted-foreground">يحتاج انتباهاً</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
            {formatNumber(metrics.lowStock)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            منخفض أو نافد
          </p>
        </div>

        <div className="border-b border-cacao-800/10 p-5 sm:border-b-0 sm:border-s">
          <Boxes className="mb-3 size-4 text-pistachio-400" />
          <p className="text-xs text-muted-foreground">قيمة المخزون</p>
          <CurrencyDisplay
            amount={metrics.inventoryValue}
            className="mt-1 text-xl font-semibold"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            بسعر التكلفة
          </p>
        </div>

        <div className="p-5 sm:border-s sm:border-cacao-800/10">
          <Sparkles className="mb-3 size-4 text-gold-400" />
          <p className="text-xs text-muted-foreground">بوكسات وتجميعات</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
            {formatNumber(metrics.bundles)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            أصناف مركّبة
          </p>
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-[1fr_220px_180px]">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="بحث بالاسم أو SKU أو الباركود..."
            className="ps-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger aria-label="تصفية حسب الفئة">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES}>كل الفئات</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.nameAr}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={stockFilter}
          onValueChange={(value) => setStockFilter(value as StockFilter)}
        >
          <SelectTrigger aria-label="تصفية حسب المخزون">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            <SelectItem value="available">متوفر</SelectItem>
            <SelectItem value="low">مخزون منخفض</SelectItem>
            <SelectItem value="out">نافد</SelectItem>
            <SelectItem value="inactive">موقوف</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="لا توجد أصناف مطابقة"
          description={
            products.length === 0
              ? "ابدأ بإضافة أول صنف وربط رصيده الافتتاحي"
              : "غيّر البحث أو عوامل التصفية"
          }
          action={
            products.length === 0 ? (
              <Button onClick={openCreate}>
                <PackagePlus className="size-4" />
                إضافة أول صنف
              </Button>
            ) : null
          }
        />
      ) : (
        <Tabs defaultValue="grid">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              عرض {formatNumber(filtered.length)} صنف
            </p>
            <TabsList>
              <TabsTrigger value="grid">شبكة</TabsTrigger>
              <TabsTrigger value="table">جدول</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="grid" className="mt-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => openEdit(product)}
                  className={cn(
                    "group overflow-hidden rounded-xl border border-cacao-800/10 bg-card text-start",
                    "transition-[border-color,background-color,transform] hover:-translate-y-0.5 hover:border-gold-400/30",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:translate-y-0",
                    !product.isActive && "opacity-65",
                  )}
                >
                  <div className="relative">
                    <ProductImage
                      src={product.imageUrl}
                      alt={product.nameAr}
                      size="hero"
                      rounded="none"
                      className="h-40 w-full max-w-none rounded-none border-0 border-b border-cacao-800/10"
                    />
                    <span className="absolute end-2 top-2 flex size-8 items-center justify-center rounded-md bg-background/80 text-muted-foreground opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                      <Pencil className="size-4" />
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold">
                          {product.nameAr}
                        </h3>
                        <p
                          className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground"
                          dir="ltr"
                        >
                          {product.sku}
                        </p>
                      </div>
                      {product.isBundle ? (
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          بوكس
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {categoryMap.get(product.categoryId) ?? "بلا فئة"}
                    </p>

                    <div className="mt-4 flex items-end justify-between gap-3 border-t border-cacao-800/10 pt-3">
                      <div>
                        <CurrencyDisplay
                          amount={product.retailPrice}
                          className="font-semibold"
                        />
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          مخزون {formatNumber(product.stockQuantity)}
                        </p>
                      </div>
                      {product.isActive ? (
                        <StatusBadge
                          type="stock"
                          status={stockStatus(product)}
                        />
                      ) : (
                        <Badge variant="secondary">موقوف</Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="table" className="mt-4">
            <div className="overflow-x-auto rounded-xl border border-cacao-800/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cacao-800/10 bg-muted/40">
                    <th className="p-3 text-start font-medium">الصنف</th>
                    <th className="p-3 text-start font-medium">الفئة</th>
                    <th className="p-3 text-start font-medium">التكلفة</th>
                    <th className="p-3 text-start font-medium">البيع</th>
                    <th className="p-3 text-start font-medium">المخزون</th>
                    <th className="p-3 text-start font-medium">الحالة</th>
                    <th className="p-3 text-end font-medium">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((product) => (
                    <tr
                      key={product.id}
                      className="border-b border-cacao-800/[0.06] last:border-b-0 hover:bg-muted/30"
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <ProductImage
                            src={product.imageUrl}
                            alt={product.nameAr}
                            size="sm"
                          />
                          <div>
                            <p className="font-medium">{product.nameAr}</p>
                            <p
                              className="font-mono text-[11px] text-muted-foreground"
                              dir="ltr"
                            >
                              {product.sku}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        {categoryMap.get(product.categoryId) ?? "—"}
                      </td>
                      <td className="p-3">
                        <CurrencyDisplay amount={product.costPrice} />
                      </td>
                      <td className="p-3">
                        <CurrencyDisplay
                          amount={product.retailPrice}
                          className="font-medium"
                        />
                      </td>
                      <td className="p-3 font-mono tabular-nums">
                        {formatNumber(product.stockQuantity)}
                      </td>
                      <td className="p-3">
                        {product.isActive ? (
                          <StatusBadge
                            type="stock"
                            status={stockStatus(product)}
                          />
                        ) : (
                          <Badge variant="secondary">موقوف</Badge>
                        )}
                      </td>
                      <td className="p-3 text-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(product)}
                        >
                          <Pencil className="size-3.5" />
                          تعديل
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      )}

      <ProductEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        product={selectedProduct}
        categories={categories}
        onAddCategory={() => setCategoryOpen(true)}
        autoSelectCategoryId={autoSelectCategoryId}
        onAutoSelectCategoryHandled={() => setAutoSelectCategoryId(null)}
        onSaved={() => {
          void loadCatalog();
        }}
      />

      <CategoryCreateDialog
        open={categoryOpen}
        onOpenChange={setCategoryOpen}
        categories={categories}
        onCreated={(category) => {
          setAutoSelectCategoryId(category.id);
          void loadCatalog();
          if (!editorOpen) {
            setSelectedProduct(null);
            setEditorOpen(true);
          }
        }}
      />

      <ProductImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => {
          void loadCatalog();
        }}
      />
    </div>
  );
}
