"use client";

import { useCallback, useState } from "react";
import { Percent, Plus } from "lucide-react";
import { toast } from "sonner";

import { CurrencyDisplay } from "@/components/shared/currency-display";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStoreSubscription } from "@/hooks/use-store-subscription";
import {
  createCoupon,
  createDiscount,
  getCoupons,
  getDiscounts,
  getSettings,
} from "@/lib/data/store";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Coupon, CouponType, Discount, DiscountType } from "@/types";

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [value, setValue] = useState("10");
  const [type, setType] = useState<DiscountType>("percentage");
  const [couponType, setCouponType] = useState<CouponType>("percentage");

  const refresh = useCallback(() => {
    setDiscounts(getDiscounts());
    setCoupons(getCoupons());
    setLoading(false);
  }, []);

  useStoreSubscription(refresh);

  const saveDiscount = () => {
    const settings = getSettings();
    createDiscount({
      branchId: settings.branchId,
      name: name.trim(),
      type,
      value: Number(value) || 0,
      minCartAmount: 0,
      startDate: null,
      endDate: null,
      isActive: true,
    });
    toast.success("تم إنشاء الخصم");
    setDiscountOpen(false);
    setName("");
  };

  const saveCoupon = () => {
    const settings = getSettings();
    createCoupon({
      branchId: settings.branchId,
      code: code.trim().toUpperCase(),
      type: couponType,
      value: Number(value) || 0,
      minCartAmount: 0,
      maxUses: 100,
      startDate: null,
      endDate: null,
      isActive: true,
    });
    toast.success("تم إنشاء الكوبون");
    setCouponOpen(false);
    setCode("");
  };

  if (loading) {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      <PageHeader
        title="الخصومات والكوبونات"
        description="إدارة العروض الترويجية"
        actions={
          <>
            <Button variant="outline" onClick={() => setDiscountOpen(true)}>
              <Plus className="size-4" />
              خصم
            </Button>
            <Button onClick={() => setCouponOpen(true)}>
              <Plus className="size-4" />
              كوبون
            </Button>
          </>
        }
      />

      <Tabs defaultValue="discounts">
        <TabsList>
          <TabsTrigger value="discounts">
            الخصومات ({discounts.length})
          </TabsTrigger>
          <TabsTrigger value="coupons">الكوبونات ({coupons.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="discounts" className="mt-4">
          {discounts.length === 0 ? (
            <EmptyState icon={Percent} title="لا توجد خصومات" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {discounts.map((d) => (
                <Card key={d.id} className="border-cacao-800/8 shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-base">
                      {d.name}
                      <Badge variant={d.isActive ? "default" : "secondary"}>
                        {d.isActive ? "نشط" : "معطّل"}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p>
                      {d.type === "percentage" ? (
                        `${d.value}%`
                      ) : (
                        <CurrencyDisplay
                          amount={d.value}
                          className="inline text-sm"
                        />
                      )}
                    </p>
                    <p className="text-muted-foreground">
                      حد أدنى:{" "}
                      <CurrencyDisplay
                        amount={d.minCartAmount}
                        className="inline text-sm"
                      />
                    </p>
                    {d.endDate ? (
                      <p className="text-xs text-muted-foreground">
                        ينتهي: {formatDate(d.endDate)}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="coupons" className="mt-4">
          {coupons.length === 0 ? (
            <EmptyState icon={Percent} title="لا توجد كوبونات" />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-cacao-800/8">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-start font-medium">الكود</th>
                    <th className="p-3 text-start font-medium">النوع</th>
                    <th className="p-3 text-start font-medium">القيمة</th>
                    <th className="p-3 text-start font-medium">الاستخدام</th>
                    <th className="p-3 text-start font-medium">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((c) => (
                    <tr key={c.id} className="border-b border-cacao-800/6">
                      <td className="p-3 font-mono font-medium">{c.code}</td>
                      <td className="p-3">{c.type}</td>
                      <td className="p-3">
                        {c.type === "percentage" ? (
                          `${c.value}%`
                        ) : (
                          <CurrencyDisplay
                            amount={c.value}
                            className="inline text-sm"
                          />
                        )}
                      </td>
                      <td className="p-3">
                        {c.usedCount} / {c.maxUses}
                      </td>
                      <td className="p-3">
                        <Badge variant={c.isActive ? "default" : "secondary"}>
                          {c.isActive ? "نشط" : "معطّل"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={discountOpen} onOpenChange={setDiscountOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>خصم جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>الاسم</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>النوع</Label>
              <Select value={type} onValueChange={(v) => setType(v as DiscountType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">نسبة</SelectItem>
                  <SelectItem value="fixed">مبلغ ثابت</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>القيمة</Label>
              <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} dir="ltr" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveDiscount}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={couponOpen} onOpenChange={setCouponOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>كوبون جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>الكود</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} dir="ltr" className="font-mono uppercase" />
            </div>
            <div className="space-y-2">
              <Label>النوع</Label>
              <Select value={couponType} onValueChange={(v) => setCouponType(v as CouponType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">نسبة</SelectItem>
                  <SelectItem value="fixed">مبلغ ثابت</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>القيمة</Label>
              <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} dir="ltr" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveCoupon}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
