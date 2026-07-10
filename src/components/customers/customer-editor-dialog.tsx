"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Mail,
  MessageCircle,
  Save,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { CurrencyDisplay } from "@/components/shared/currency-display";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  createCustomer,
  getState,
  updateCustomer,
} from "@/lib/data/store";
import type { Customer } from "@/types";
import { formatNumber } from "@/lib/utils";

interface CustomerForm {
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  birthday: string;
  loyaltyTierId: string;
  wholesalePricing: boolean;
  notes: string;
}

function customerToForm(
  customer: Customer | null,
  defaultTierId: string,
): CustomerForm {
  return {
    name: customer?.name ?? "",
    phone: customer?.phone ?? "",
    whatsapp: customer?.whatsapp ?? "",
    email: customer?.email ?? "",
    birthday: customer?.birthday ?? "",
    loyaltyTierId: customer?.loyaltyTierId ?? defaultTierId,
    wholesalePricing: customer?.wholesalePricing ?? false,
    notes: customer?.notes ?? "",
  };
}

interface CustomerEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  onSaved: (customer: Customer) => void;
}

export function CustomerEditorDialog({
  open,
  onOpenChange,
  customer,
  onSaved,
}: CustomerEditorDialogProps) {
  const state = getState();
  const loyaltyTiers = useMemo(
    () => [...state.loyaltyTiers].sort((a, b) => a.minPoints - b.minPoints),
    [state.loyaltyTiers],
  );
  const defaultTierId = loyaltyTiers[0]?.id ?? "";
  const [form, setForm] = useState<CustomerForm>(() =>
    customerToForm(customer, defaultTierId),
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(customerToForm(customer, defaultTierId));
    setSaving(false);
  }, [customer, defaultTierId, open]);

  const updateForm = <Key extends keyof CustomerForm>(
    key: Key,
    value: CustomerForm[Key],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const currentState = getState();
      const payload = {
        branchId: currentState.settings.branchId,
        name: form.name,
        phone: form.phone,
        whatsapp: form.whatsapp || form.phone,
        email: form.email || null,
        notes: form.notes || null,
        birthday: form.birthday || null,
        loyaltyTierId: form.loyaltyTierId || defaultTierId,
        wholesalePricing: form.wholesalePricing,
      };
      const saved = customer
        ? updateCustomer(customer.id, payload)
        : createCustomer(payload);
      if (!saved) throw new Error("تعذر العثور على العميل");

      toast.success(customer ? "تم تحديث بيانات العميل" : "تم إنشاء ملف العميل");
      onSaved(saved);
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذر حفظ بيانات العميل",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={submit} className="space-y-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserRound className="size-5 text-gold-400" />
              {customer ? `ملف ${customer.name}` : "إضافة عميل"}
            </DialogTitle>
          </DialogHeader>

          {customer ? (
            <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-cacao-800/10">
              <div className="p-3">
                <p className="text-[11px] text-muted-foreground">الطلبات</p>
                <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
                  {formatNumber(customer.orderCount)}
                </p>
              </div>
              <div className="border-s border-cacao-800/10 p-3">
                <p className="text-[11px] text-muted-foreground">الإنفاق</p>
                <CurrencyDisplay
                  amount={customer.totalSpent}
                  className="mt-1 font-semibold"
                />
              </div>
              <div className="border-s border-cacao-800/10 p-3">
                <p className="text-[11px] text-muted-foreground">نقاط الولاء</p>
                <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
                  {formatNumber(customer.loyaltyPoints)}
                </p>
              </div>
            </div>
          ) : null}

          <section className="space-y-4">
            <h3 className="text-sm font-semibold">التواصل</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customer-name">اسم العميل *</Label>
                <Input
                  id="customer-name"
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                  autoFocus
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-phone">رقم الهاتف *</Label>
                <Input
                  id="customer-phone"
                  value={form.phone}
                  onChange={(event) => updateForm("phone", event.target.value)}
                  inputMode="tel"
                  autoComplete="tel"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-whatsapp">واتساب</Label>
                <div className="relative">
                  <MessageCircle className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="customer-whatsapp"
                    value={form.whatsapp}
                    onChange={(event) =>
                      updateForm("whatsapp", event.target.value)
                    }
                    inputMode="tel"
                    dir="ltr"
                    className="ps-9"
                    placeholder="يُستخدم رقم الهاتف عند تركه فارغاً"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-email">البريد الإلكتروني</Label>
                <div className="relative">
                  <Mail className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="customer-email"
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      updateForm("email", event.target.value)
                    }
                    autoComplete="email"
                    dir="ltr"
                    className="ps-9"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t border-cacao-800/10 pt-5">
            <h3 className="text-sm font-semibold">الملف التجاري والولاء</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customer-birthday">تاريخ الميلاد</Label>
                <div className="relative">
                  <CalendarDays className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="customer-birthday"
                    type="date"
                    value={form.birthday}
                    onChange={(event) =>
                      updateForm("birthday", event.target.value)
                    }
                    dir="ltr"
                    className="ps-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>فئة الولاء</Label>
                <Select
                  value={form.loyaltyTierId}
                  onValueChange={(value) =>
                    updateForm("loyaltyTierId", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر فئة الولاء" />
                  </SelectTrigger>
                  <SelectContent>
                    {loyaltyTiers.map((tier) => (
                      <SelectItem key={tier.id} value={tier.id}>
                        {tier.nameAr} — من {formatNumber(tier.minPoints)} نقطة
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border border-cacao-800/10 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">تسعير جملة</p>
                  {form.wholesalePricing ? (
                    <Badge variant="outline">نشط</Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  يطبّق سعر الجملة تلقائياً عند ربط العميل بالفاتورة
                </p>
              </div>
              <Switch
                checked={form.wholesalePricing}
                onCheckedChange={(checked) =>
                  updateForm("wholesalePricing", checked)
                }
                aria-label="تفعيل تسعير الجملة"
              />
            </div>
          </section>

          <div className="space-y-2">
            <Label htmlFor="customer-notes">ملاحظات العميل</Label>
            <Textarea
              id="customer-notes"
              value={form.notes}
              onChange={(event) => updateForm("notes", event.target.value)}
              placeholder="تفضيلات التغليف، العناوين المعتادة أو ملاحظات الخدمة"
              className="min-h-24"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={saving} className="gap-2">
              <Save className="size-4" />
              {saving ? "جاري الحفظ..." : "حفظ ملف العميل"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
