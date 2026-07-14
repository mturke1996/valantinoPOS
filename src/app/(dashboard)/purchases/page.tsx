"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import { PurchaseOrderDialog } from "@/components/documents/purchase-order-dialog";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useStoreSubscription } from "@/hooks/use-store-subscription";
import {
  createPurchaseOrder,
  getProducts,
  getPurchaseOrders,
  getSettings,
  getSuppliers,
  receivePurchaseOrder,
} from "@/lib/data/store";
import { formatDate } from "@/lib/utils";
import { generateId } from "@/lib/utils";
import type { PurchaseOrder } from "@/types";

const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  sent: "مُرسل",
  partial: "استلام جزئي",
  received: "مُستلم",
  cancelled: "ملغي",
};

export default function PurchasesPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [supplierMap, setSupplierMap] = useState<Map<string, string>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState<string | null>(null);
  const [printPo, setPrintPo] = useState<PurchaseOrder | null>(null);
  const [supplierId, setSupplierId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("10");
  const [unitCost, setUnitCost] = useState("1");
  const [batchNumber, setBatchNumber] = useState("LOT-001");
  const [expiryDate, setExpiryDate] = useState("");

  const refresh = useCallback(() => {
    setOrders(getPurchaseOrders());
    setSupplierMap(new Map(getSuppliers().map((s) => [s.id, s.name])));
    setLoading(false);
  }, []);

  useStoreSubscription(refresh);

  useEffect(() => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 6);
    setExpiryDate(nextMonth.toISOString().slice(0, 10));
  }, []);

  const createPo = () => {
    const settings = getSettings();
    const product = getProducts().find((p) => p.id === productId);
    if (!supplierId || !product) {
      toast.error("اختر المورد والمنتج");
      return;
    }
    const qty = Number(quantity) || 0;
    const cost = Number(unitCost) || 0;
    const lineTotal = qty * cost;
    createPurchaseOrder({
      branchId: settings.branchId,
      supplierId,
      status: "sent",
      items: [
        {
          id: generateId(),
          purchaseOrderId: "",
          productId: product.id,
          productNameAr: product.nameAr,
          quantity: qty,
          receivedQuantity: 0,
          unitCost: cost,
          total: lineTotal,
        },
      ],
      subtotal: lineTotal,
      taxAmount: 0,
      total: lineTotal,
      notes: null,
      expectedDate: new Date().toISOString().slice(0, 10),
      receivedAt: null,
    });
    toast.success("تم إنشاء أمر الشراء");
    setCreateOpen(false);
  };

  const receivePo = (poId: string) => {
    const po = orders.find((o) => o.id === poId);
    const line = po?.items[0];
    if (!po || !line) return;
    receivePurchaseOrder(poId, [
      {
        itemId: line.id,
        quantity: line.quantity - line.receivedQuantity,
        batchNumber,
        expiryDate,
        costPerUnit: line.unitCost,
      },
    ]);
    toast.success("تم استلام البضاعة وتحديث المخزون");
    setReceiveOpen(null);
  };

  if (loading) {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const suppliers = getSuppliers();
  const products = getProducts().filter((p) => p.isActive);

  return (
    <div className="space-y-6 py-4">
      <PageHeader
        title="المشتريات"
        description="أوامر الشراء والاستلام"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            أمر شراء
          </Button>
        }
      />

      {orders.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="لا توجد أوامر شراء" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-cacao-800/8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-start font-medium">رقم الأمر</th>
                <th className="p-3 text-start font-medium">المورد</th>
                <th className="p-3 text-start font-medium">الحالة</th>
                <th className="p-3 text-start font-medium">الإجمالي</th>
                <th className="p-3 text-start font-medium">التاريخ</th>
                <th className="p-3 text-start font-medium">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((po) => (
                <tr key={po.id} className="border-b border-cacao-800/6">
                  <td className="p-3 font-medium">{po.poNumber}</td>
                  <td className="p-3">
                    {supplierMap.get(po.supplierId) ?? "—"}
                  </td>
                  <td className="p-3">
                    <Badge variant="outline">
                      {STATUS_LABELS[po.status] ?? po.status}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <CurrencyDisplay amount={po.total} />
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {po.expectedDate ? formatDate(po.expectedDate) : "—"}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPrintPo(po)}
                      >
                        <FileText className="size-3.5" />
                        طباعة
                      </Button>
                      {po.status !== "received" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setReceiveOpen(po.id)}
                        >
                          استلام
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>أمر شراء جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>المورد</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المورد" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>المنتج</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المنتج" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nameAr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>الكمية</Label>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>تكلفة الوحدة</Label>
                <Input
                  type="number"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  dir="ltr"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={createPo}>إنشاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={receiveOpen !== null}
        onOpenChange={(open) => !open && setReceiveOpen(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>استلام بضاعة</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>رقم الدفعة</Label>
              <Input
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                dir="ltr"
                className="font-mono uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label>تاريخ الانتهاء</Label>
              <Input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                dir="ltr"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => receiveOpen && receivePo(receiveOpen)}>
              تأكيد الاستلام
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {printPo ? (
        <PurchaseOrderDialog
          open={Boolean(printPo)}
          onOpenChange={(next) => {
            if (!next) setPrintPo(null);
          }}
          purchaseOrder={printPo}
        />
      ) : null}
    </div>
  );
}
