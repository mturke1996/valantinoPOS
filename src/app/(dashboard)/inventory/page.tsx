"use client";

import { useCallback, useMemo, useState } from "react";
import { AlertTriangle, ClipboardList } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStoreSubscription } from "@/hooks/use-store-subscription";
import { getExpiringBatches } from "@/lib/services/inventory.service";
import { getProducts, getState } from "@/lib/data/store";
import { formatDate, formatNumber } from "@/lib/utils";
import type { InventoryMovement, Product } from "@/types";

const MOVEMENT_LABELS: Record<string, string> = {
  add: "إضافة",
  deduct: "خصم",
  transfer: "نقل",
  waste: "هدر",
  expiry: "انتهاء",
  sale: "بيع",
  return: "مرتجع",
  adjust: "تعديل",
};

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [expiringCount, setExpiringCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    const state = getState();
    setProducts(getProducts());
    setMovements(
      [...state.inventoryMovements]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 50),
    );
    setExpiringCount(getExpiringBatches(state.batches, 14).length);
    setLoading(false);
  }, []);

  useStoreSubscription(refresh);

  const lowStock = useMemo(
    () =>
      products.filter(
        (p) => p.isActive && p.stockQuantity <= p.minStock,
      ),
    [products],
  );

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p.nameAr])),
    [products],
  );

  if (loading) {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      <PageHeader title="المخزون" description="مستويات المخزون والحركات" />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-cacao-800/8 shadow-none">
          <CardContent className="flex items-center gap-4 p-5">
            <AlertTriangle className="size-8 text-caramel-500" />
            <div>
              <p className="text-sm text-muted-foreground">مخزون منخفض</p>
              <p className="text-2xl font-semibold">{lowStock.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-cacao-800/8 shadow-none">
          <CardContent className="flex items-center gap-4 p-5">
            <ClipboardList className="size-8 text-gold-400" />
            <div>
              <p className="text-sm text-muted-foreground">حركات اليوم</p>
              <p className="text-2xl font-semibold">{movements.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-cacao-800/8 shadow-none">
          <CardContent className="flex items-center gap-4 p-5">
            <AlertTriangle className="size-8 text-berry-500" />
            <div>
              <p className="text-sm text-muted-foreground">دفعات قاربت الانتهاء</p>
              <p className="text-2xl font-semibold">{expiringCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">مستويات المخزون</TabsTrigger>
          <TabsTrigger value="movements">الحركات</TabsTrigger>
          <TabsTrigger value="alerts">تنبيهات</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="mt-4">
          <div className="overflow-x-auto rounded-lg border border-cacao-800/8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-start font-medium">المنتج</th>
                  <th className="p-3 text-start font-medium">المخزون</th>
                  <th className="p-3 text-start font-medium">الحد الأدنى</th>
                  <th className="p-3 text-start font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b border-cacao-800/6">
                    <td className="p-3 font-medium">{product.nameAr}</td>
                    <td className="p-3">{formatNumber(product.stockQuantity)}</td>
                    <td className="p-3">{formatNumber(product.minStock)}</td>
                    <td className="p-3">
                      <StatusBadge
                        type="stock"
                        status={
                          product.stockQuantity <= 0
                            ? "out_of_stock"
                            : product.stockQuantity <= product.minStock
                              ? "low_stock"
                              : "in_stock"
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="movements" className="mt-4">
          {movements.length === 0 ? (
            <EmptyState icon={ClipboardList} title="لا توجد حركات" />
          ) : (
            <div className="space-y-2">
              {movements.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-md border border-cacao-800/8 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">
                      {productMap.get(m.productId) ?? m.productId}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {MOVEMENT_LABELS[m.type] ?? m.type} ·{" "}
                      {formatDate(m.createdAt, "dd MMM HH:mm")}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {m.type === "deduct" || m.type === "sale" ? "-" : "+"}
                    {formatNumber(m.quantity)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="alerts" className="mt-4">
          {lowStock.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="لا توجد تنبيهات"
              description="جميع المنتجات فوق الحد الأدنى"
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {lowStock.map((product) => (
                <Card key={product.id} className="border-caramel-500/20 shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{product.nameAr}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-caramel-500">
                      المخزون: {formatNumber(product.stockQuantity)} / الحد:{" "}
                      {formatNumber(product.minStock)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
