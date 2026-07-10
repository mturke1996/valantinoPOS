"use client";

import { useCallback, useMemo, useState } from "react";
import { Plus, Wallet } from "lucide-react";
import { toast } from "sonner";

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
import { Skeleton } from "@/components/ui/skeleton";
import { useStoreSubscription } from "@/hooks/use-store-subscription";
import { getAuthSession } from "@/lib/auth";
import {
  createExpense,
  getExpenses,
  getSettings,
} from "@/lib/data/store";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { Expense } from "@/types";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("تشغيل");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  const refresh = useCallback(() => {
    setExpenses(
      [...getExpenses()].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    );
    setLoading(false);
  }, []);

  useStoreSubscription(refresh);

  const total = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses],
  );

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
        title="المصروفات"
        description={`إجمالي المصروفات: ${formatCurrency(total)}`}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            مصروف جديد
          </Button>
        }
      />

      {expenses.length === 0 ? (
        <EmptyState icon={Wallet} title="لا توجد مصروفات" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-cacao-800/8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-start font-medium">التاريخ</th>
                <th className="p-3 text-start font-medium">الفئة</th>
                <th className="p-3 text-start font-medium">الوصف</th>
                <th className="p-3 text-start font-medium">المبلغ</th>
                <th className="p-3 text-start font-medium">متكرر</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id} className="border-b border-cacao-800/6">
                  <td className="p-3 text-muted-foreground">
                    {formatDate(expense.date)}
                  </td>
                  <td className="p-3">
                    <Badge variant="outline">{expense.category}</Badge>
                  </td>
                  <td className="p-3">{expense.description}</td>
                  <td className="p-3">
                    <CurrencyDisplay amount={expense.amount} />
                  </td>
                  <td className="p-3">
                    {expense.isRecurring ? "نعم" : "لا"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>مصروف جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>الفئة</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>المبلغ</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} dir="ltr" />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                const settings = getSettings();
                createExpense({
                  branchId: settings.branchId,
                  category: category.trim(),
                  description: description.trim(),
                  amount: Number(amount) || 0,
                  date: new Date().toISOString().slice(0, 10),
                  isRecurring: false,
                  createdBy: getAuthSession()?.userId ?? null,
                });
                toast.success("تم تسجيل المصروف");
                setOpen(false);
                setDescription("");
                setAmount("");
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
