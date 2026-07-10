"use client";

import { useMemo, useState } from "react";
import { Check, Plus, Search, UserRound, X } from "lucide-react";
import { toast } from "sonner";

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
import { ScrollArea } from "@/components/ui/scroll-area";
import { createCustomer, getState } from "@/lib/data/store";
import { cn, formatNumber } from "@/lib/utils";
import type { Customer } from "@/types";

interface PosCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedId: string | null;
  onSelect: (customerId: string | null) => void;
}

export function PosCustomerDialog({
  open,
  onOpenChange,
  selectedId,
  onSelect,
}: PosCustomerDialogProps) {
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [, forceRefresh] = useState(0);

  const state = getState();
  const customers = state.customers.filter((customer) => !customer.deletedAt);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ar");
    if (!query) return customers;
    return customers.filter(
      (customer) =>
        customer.name.toLocaleLowerCase("ar").includes(query) ||
        customer.phone.includes(query),
    );
  }, [customers, search]);

  const selectCustomer = (customer: Customer | null) => {
    onSelect(customer?.id ?? null);
    onOpenChange(false);
    setSearch("");
    setCreating(false);
  };

  const handleCreate = () => {
    const cleanName = name.trim();
    const cleanPhone = phone.replace(/\s+/g, "");
    if (cleanName.length < 2) {
      toast.error("أدخل اسم العميل");
      return;
    }
    if (!/^\+?\d{8,15}$/.test(cleanPhone)) {
      toast.error("أدخل رقم هاتف صحيح");
      return;
    }
    if (customers.some((customer) => customer.phone === cleanPhone)) {
      toast.error("رقم الهاتف مسجل لعميل آخر");
      return;
    }

    const defaultTier =
      [...state.loyaltyTiers].sort((a, b) => a.minPoints - b.minPoints)[0] ??
      null;
    if (!defaultTier) {
      toast.error("لا توجد فئة ولاء افتراضية");
      return;
    }

    const customer = createCustomer({
      branchId: state.settings.branchId,
      name: cleanName,
      phone: cleanPhone,
      whatsapp: cleanPhone,
      email: null,
      notes: null,
      birthday: null,
      loyaltyTierId: defaultTier.id,
      wholesalePricing: false,
    });

    forceRefresh((value) => value + 1);
    setName("");
    setPhone("");
    toast.success("تم حفظ العميل وربطه بالسلة");
    selectCustomer(customer);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85svh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserRound className="size-5 text-gold-400" />
            عميل الفاتورة
          </DialogTitle>
        </DialogHeader>

        {creating ? (
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="pos-customer-name">الاسم</Label>
              <Input
                id="pos-customer-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoFocus
                autoComplete="name"
                placeholder="اسم العميل"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pos-customer-phone">رقم الهاتف</Label>
              <Input
                id="pos-customer-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
                placeholder="05xxxxxxxx"
              />
            </div>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="ps-9"
                placeholder="ابحث بالاسم أو الهاتف"
                autoFocus
              />
            </div>

            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-1 py-3">
                <button
                  type="button"
                  onClick={() => selectCustomer(null)}
                  className={cn(
                    "flex min-h-12 w-full items-center justify-between rounded-lg px-3 text-start transition-colors",
                    "hover:bg-cacao-800/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selectedId === null && "bg-gold-400/10",
                  )}
                >
                  <div>
                    <p className="text-sm font-medium">عميل نقدي</p>
                    <p className="text-xs text-muted-foreground">
                      بدون ملف عميل أو نقاط ولاء
                    </p>
                  </div>
                  {selectedId === null ? (
                    <Check className="size-4 text-gold-400" />
                  ) : null}
                </button>

                {filteredCustomers.map((customer) => {
                  const selected = customer.id === selectedId;
                  const tier = state.loyaltyTiers.find(
                    (item) => item.id === customer.loyaltyTierId,
                  );

                  return (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => selectCustomer(customer)}
                      className={cn(
                        "flex min-h-14 w-full items-center justify-between gap-3 rounded-lg px-3 text-start transition-colors",
                        "hover:bg-cacao-800/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        selected && "bg-gold-400/10",
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">
                            {customer.name}
                          </p>
                          {tier ? (
                            <Badge variant="outline" className="text-[10px]">
                              {tier.nameAr}
                            </Badge>
                          ) : null}
                        </div>
                        <p
                          dir="ltr"
                          className="mt-0.5 text-end text-xs text-muted-foreground"
                        >
                          {customer.phone}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatNumber(customer.loyaltyPoints)} نقطة
                        </span>
                        {selected ? (
                          <Check className="size-4 text-gold-400" />
                        ) : null}
                      </div>
                    </button>
                  );
                })}

                {filteredCustomers.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm font-medium">لا يوجد عميل مطابق</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      يمكنك إنشاء ملف جديد خلال ثوانٍ
                    </p>
                  </div>
                ) : null}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          {creating ? (
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  setCreating(false);
                  setName("");
                  setPhone("");
                }}
              >
                <X className="size-4" />
                رجوع
              </Button>
              <Button onClick={handleCreate}>حفظ العميل</Button>
            </>
          ) : (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setCreating(true)}
            >
              <Plus className="size-4" />
              عميل جديد
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
