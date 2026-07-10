"use client";

import {
  useCallback,
  useDeferredValue,
  useMemo,
  useState,
} from "react";
import {
  Crown,
  MessageCircle,
  Pencil,
  Search,
  ShoppingBag,
  UserPlus,
  Users,
  WalletCards,
} from "lucide-react";

import { CustomerEditorDialog } from "@/components/customers/customer-editor-dialog";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useStoreSubscription } from "@/hooks/use-store-subscription";
import { getCustomers } from "@/lib/data/store";
import type { Customer } from "@/types";
import { formatDate, formatNumber, roundMoney } from "@/lib/utils";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const deferredSearch = useDeferredValue(search);

  const loadCustomers = useCallback(() => {
    setCustomers(getCustomers());
    setLoading(false);
  }, []);

  useStoreSubscription(loadCustomers);

  const filtered = useMemo(() => {
    const query = deferredSearch.trim().toLocaleLowerCase("ar");
    if (!query) return customers;
    return customers.filter(
      (customer) =>
        customer.name.toLocaleLowerCase("ar").includes(query) ||
        customer.phone.includes(query) ||
        customer.whatsapp?.includes(query) ||
        customer.email?.toLocaleLowerCase("en").includes(query),
    );
  }, [customers, deferredSearch]);

  const metrics = useMemo(
    () => ({
      repeat: customers.filter((customer) => customer.orderCount > 1).length,
      wholesale: customers.filter((customer) => customer.wholesalePricing)
        .length,
      totalSpent: roundMoney(
        customers.reduce((sum, customer) => sum + customer.totalSpent, 0),
      ),
    }),
    [customers],
  );

  const openCreate = () => {
    setSelectedCustomer(null);
    setEditorOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setEditorOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-28" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      <PageHeader
        title="دفتر العملاء"
        description="بيانات التواصل والولاء والتسعير وسجل العلاقة مع العميل"
        actions={
          <Button className="gap-2" onClick={openCreate}>
            <UserPlus className="size-4" />
            إضافة عميل
          </Button>
        }
      />

      <section className="grid overflow-hidden rounded-xl border border-cacao-800/10 bg-card sm:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="bg-cacao-800 p-5 text-cream-50">
          <Users className="mb-3 size-4 text-gold-400" />
          <p className="text-xs text-cream-100/70">إجمالي ملفات العملاء</p>
          <p className="mt-1 font-mono text-3xl font-semibold tabular-nums">
            {formatNumber(customers.length)}
          </p>
        </div>
        <div className="border-b border-cacao-800/10 p-5 sm:border-b-0 sm:border-s">
          <ShoppingBag className="mb-3 size-4 text-pistachio-400" />
          <p className="text-xs text-muted-foreground">عملاء متكررون</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
            {formatNumber(metrics.repeat)}
          </p>
        </div>
        <div className="border-b border-cacao-800/10 p-5 sm:border-b-0 sm:border-s">
          <WalletCards className="mb-3 size-4 text-gold-400" />
          <p className="text-xs text-muted-foreground">إجمالي الإنفاق</p>
          <CurrencyDisplay
            amount={metrics.totalSpent}
            className="mt-1 text-xl font-semibold"
          />
        </div>
        <div className="p-5 sm:border-s sm:border-cacao-800/10">
          <Crown className="mb-3 size-4 text-caramel-500" />
          <p className="text-xs text-muted-foreground">حسابات جملة</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
            {formatNumber(metrics.wholesale)}
          </p>
        </div>
      </section>

      <div className="relative max-w-lg">
        <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="بحث بالاسم أو الهاتف أو واتساب أو البريد..."
          className="ps-9"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="لا توجد ملفات مطابقة"
          description={
            customers.length === 0
              ? "أضف أول عميل لتفعيل سجل الطلبات والولاء"
              : "جرّب عبارة بحث أخرى"
          }
          action={
            customers.length === 0 ? (
              <Button onClick={openCreate}>
                <UserPlus className="size-4" />
                إضافة أول عميل
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-cacao-800/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cacao-800/10 bg-muted/40">
                <th className="p-3 text-start font-medium">العميل</th>
                <th className="p-3 text-start font-medium">التواصل</th>
                <th className="p-3 text-start font-medium">الولاء</th>
                <th className="p-3 text-start font-medium">الطلبات</th>
                <th className="p-3 text-start font-medium">الإنفاق</th>
                <th className="p-3 text-start font-medium">آخر طلب</th>
                <th className="p-3 text-end font-medium">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-b border-cacao-800/[0.06] last:border-b-0 hover:bg-muted/30"
                >
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-md bg-cacao-800 text-sm font-semibold text-cream-50">
                        {customer.name.trim().charAt(0)}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{customer.name}</p>
                          {customer.wholesalePricing ? (
                            <Badge variant="outline" className="text-[10px]">
                              جملة
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {customer.email ?? "لا يوجد بريد"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <p dir="ltr" className="text-start font-mono text-xs">
                      {customer.phone}
                    </p>
                    {customer.whatsapp ? (
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <MessageCircle className="size-3" />
                        واتساب متاح
                      </p>
                    ) : null}
                  </td>
                  <td className="p-3">
                    <Badge variant="outline">
                      {formatNumber(customer.loyaltyPoints)} نقطة
                    </Badge>
                  </td>
                  <td className="p-3 font-mono tabular-nums">
                    {formatNumber(customer.orderCount)}
                  </td>
                  <td className="p-3">
                    <CurrencyDisplay
                      amount={customer.totalSpent}
                      className="font-medium"
                    />
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {customer.lastOrderAt
                      ? formatDate(customer.lastOrderAt)
                      : "—"}
                  </td>
                  <td className="p-3 text-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(customer)}
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
      )}

      <CustomerEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        customer={selectedCustomer}
        onSaved={() => loadCustomers()}
      />
    </div>
  );
}
