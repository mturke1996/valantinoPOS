"use client";

import { useCallback, useState } from "react";
import { Plus, Truck } from "lucide-react";
import { toast } from "sonner";

import { CurrencyDisplay } from "@/components/shared/currency-display";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useStoreSubscription } from "@/hooks/use-store-subscription";
import {
  createSupplier,
  getSettings,
  getSuppliers,
} from "@/lib/data/store";
import type { Supplier } from "@/types";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const refresh = useCallback(() => {
    setSuppliers(getSuppliers());
    setLoading(false);
  }, []);

  useStoreSubscription(refresh);

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
        title="الموردون"
        description={`${suppliers.length} مورد نشط`}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            مورد جديد
          </Button>
        }
      />

      {suppliers.length === 0 ? (
        <EmptyState icon={Truck} title="لا يوجد موردون" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((supplier) => (
            <Card
              key={supplier.id}
              className="border-cacao-800/8 shadow-none transition-shadow hover:shadow-md"
            >
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold">{supplier.name}</h3>
                  <Badge variant={supplier.isActive ? "default" : "secondary"}>
                    {supplier.isActive ? "نشط" : "معطّل"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {supplier.contactPerson}
                </p>
                <p className="text-sm" dir="ltr">
                  {supplier.phone}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {supplier.address}
                </p>
                <div className="flex items-center justify-between border-t border-cacao-800/8 pt-3">
                  <span className="text-sm text-muted-foreground">الرصيد</span>
                  <CurrencyDisplay amount={supplier.balance} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>مورد جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>اسم المورد</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>جهة الاتصال</Label>
              <Input value={contact} onChange={(e) => setContact(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>الهاتف</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>العنوان</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                const settings = getSettings();
                createSupplier({
                  branchId: settings.branchId,
                  name: name.trim(),
                  contactPerson: contact.trim(),
                  phone: phone.trim(),
                  email: null,
                  address: address.trim(),
                  notes: null,
                  balance: 0,
                  isActive: true,
                });
                toast.success("تم إضافة المورد");
                setOpen(false);
                setName("");
                setContact("");
                setPhone("");
                setAddress("");
              }}
            >
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
