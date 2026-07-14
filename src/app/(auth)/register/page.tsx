"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  clearAuthSession,
  getVerifiedSupabaseSession,
} from "@/lib/auth";
import { initializeStore } from "@/lib/data/store";
import { hydrateStoreFromSupabase } from "@/lib/data/hydrate";
import {
  createClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    initializeStore();
    if (!isSupabaseConfigured()) return;
    void getVerifiedSupabaseSession().then((session) => {
      if (session) router.replace("/dashboard");
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || password.length < 6) {
      toast.error("أكمل الاسم والبريد وكلمة مرور (6 أحرف على الأقل)");
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      toast.error("لم يتم إعداد الاتصال بقاعدة البيانات");
      return;
    }

    setLoading(true);
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { full_name: fullName.trim() },
      },
    });

    if (signUpError) {
      setLoading(false);
      toast.error(signUpError.message);
      return;
    }

    if (!signUpData.session) {
      setLoading(false);
      toast.success("تحقق من بريدك لتأكيد الحساب ثم سجّل الدخول");
      router.push("/login");
      return;
    }

    const { error: adminError } = await supabase.rpc(
      "provision_first_admin_profile",
      {
        p_full_name: fullName.trim(),
        p_phone: phone.trim() || null,
      },
    );

    if (adminError) {
      await supabase.auth.signOut();
      clearAuthSession();
      setLoading(false);
      if (adminError.message.includes("مُهيّأة مسبقاً")) {
        toast.error(
          "النظام مُفعّل — اطلب من المدير إنشاء حسابك من صفحة الموظفين",
        );
      } else {
        toast.error(adminError.message);
      }
      return;
    }

    const session = await getVerifiedSupabaseSession();
    if (!session) {
      await supabase.auth.signOut();
      clearAuthSession();
      setLoading(false);
      toast.error("تعذر ربط الحساب بالفرع");
      return;
    }

    await hydrateStoreFromSupabase(session);
    setLoading(false);
    toast.success(`مرحباً ${session.name} — تم تفعيل حساب المدير`);
    router.replace("/dashboard");
    router.refresh();
  };

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background p-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -end-24 top-0 size-[28rem] rounded-full bg-gold-400/12 blur-3xl" />
        <div className="absolute -start-16 bottom-0 size-80 rounded-full bg-caramel-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cacao-800 to-cacao-900 shadow-lg ring-1 ring-gold-400/25">
            <UserPlus className="size-7 text-cream-50" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">إنشاء حساب المدير</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            التسجيل المباشر متاح لأول مدير فقط — باقي الفريق يُنشأ من لوحة الموظفين
          </p>
        </div>

        <Card className="border-cacao-800/10 bg-card/90 shadow-2xl backdrop-blur-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">بيانات الحساب</CardTitle>
            <CardDescription>
              بعد التفعيل يمكنك إضافة الموظفين مباشرة بدون رموز دعوة
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">الاسم الكامل</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="أحمد محمد"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  dir="ltr"
                  className="text-start"
                  placeholder="manager@valentino.ly"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  dir="ltr"
                  className="text-start"
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">الهاتف (اختياري)</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  dir="ltr"
                  className="text-start"
                  placeholder="+218"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading} aria-busy={loading}>
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    <span>جاري إنشاء الحساب...</span>
                  </>
                ) : (
                  "إنشاء حساب المدير"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          لديك حساب؟{" "}
          <Link href="/login" className="font-medium text-gold-600 hover:underline">
            تسجيل الدخول
          </Link>
        </p>
      </div>
    </div>
  );
}
