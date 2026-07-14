"use client";

import { useCallback, useState } from "react";
import { Plus, UserCog, UserPlus } from "lucide-react";
import { toast } from "sonner";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ROLES } from "@/lib/constants/roles";
import { useStoreSubscription } from "@/hooks/use-store-subscription";
import { getAuthSession } from "@/lib/auth";
import { hydrateStoreFromSupabase } from "@/lib/data/hydrate";
import { getUsers } from "@/lib/data/store";
import { formatDate } from "@/lib/utils";
import type { RoleKey, UserProfile } from "@/types";

const ROLE_OPTIONS: RoleKey[] = [
  "cashier",
  "sales",
  "warehouse",
  "accountant",
  "delivery",
  "manager",
];

export default function StaffPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [roleKey, setRoleKey] = useState<RoleKey>("cashier");

  const refresh = useCallback(() => {
    setUsers(getUsers());
    setLoading(false);
  }, []);

  useStoreSubscription(refresh);

  const createAccount = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/staff/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          roleKey,
          phone: phone.trim() || null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "فشل الإنشاء");
      const session = getAuthSession();
      if (session) await hydrateStoreFromSupabase(session);
      toast.success("تم إنشاء الحساب — يمكن للموظف تسجيل الدخول مباشرة");
      setCreateOpen(false);
      setFullName("");
      setEmail("");
      setPassword("");
      setPhone("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "فشل الإنشاء");
    } finally {
      setSaving(false);
    }
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
        title="الموظفون"
        description="إنشاء حسابات مباشرة — بدون دعوات أو رموز"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="size-4" />
            حساب جديد
          </Button>
        }
      />

      {users.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="لا يوجد موظفون"
          description="أنشئ أول حساب للفريق"
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              حساب جديد
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {users.map((user) => (
            <Card
              key={user.id}
              className="border-cacao-800/8 shadow-none transition-shadow hover:shadow-md"
            >
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{user.fullName}</h3>
                    <p className="text-xs text-muted-foreground">
                      منذ {formatDate(user.createdAt)}
                    </p>
                  </div>
                  <Badge variant={user.isActive ? "default" : "secondary"}>
                    {user.isActive ? "نشط" : "معطّل"}
                  </Badge>
                </div>
                <Badge variant="outline" className="w-fit">
                  {ROLES[user.roleKey]?.nameAr ?? user.roleKey}
                </Badge>
                {user.phone ? (
                  <p className="text-sm" dir="ltr">
                    {user.phone}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>إنشاء حساب موظف</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="staff-full-name">الاسم</Label>
              <Input
                id="staff-full-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-email">البريد</Label>
              <Input
                id="staff-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                dir="ltr"
                className="text-start"
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-password">كلمة المرور</Label>
              <Input
                id="staff-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                dir="ltr"
                className="text-start"
                placeholder="10 أحرف · حروف وأرقام"
                minLength={10}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-role">الدور</Label>
              <Select
                value={roleKey}
                onValueChange={(v) => setRoleKey(v as RoleKey)}
              >
                <SelectTrigger id="staff-role" aria-label="الدور">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLES[role]?.nameAr ?? role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-phone">الهاتف</Label>
              <Input
                id="staff-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                dir="ltr"
                className="text-start"
                autoComplete="tel"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={createAccount} disabled={saving}>
              {saving ? "جاري الإنشاء..." : "إنشاء الحساب"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
