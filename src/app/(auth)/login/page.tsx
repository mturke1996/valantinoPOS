"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getState, initializeStore } from "@/lib/data/store";
import { hydrateStoreFromSupabase } from "@/lib/data/hydrate";
import {
  clearAuthSession,
  getAuthSession,
  getVerifiedSupabaseSession,
} from "@/lib/auth";
import {
  createClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

function getSafeReturnPath(): string {
  if (typeof window === "undefined") return "/";
  const requested = new URLSearchParams(window.location.search).get("from");
  return requested?.startsWith("/") && !requested.startsWith("//")
    ? requested
    : "/";
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    const initialize = async () => {
      if (!localStorage.getItem("valentino-pos-state")) {
        initializeStore();
      } else {
        getState();
      }

      if (!isSupabaseConfigured()) return;

      setLoading(true);
      const verified = await getVerifiedSupabaseSession();
      if (!active) return;
      if (verified) {
        router.replace(getSafeReturnPath());
        return;
      }
      if (getAuthSession()?.source === "supabase") clearAuthSession();
      setLoading(false);
    };

    void initialize();
    return () => {
      active = false;
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("أدخل البريد الإلكتروني وكلمة المرور");
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      toast.error("لم يتم إعداد الاتصال الآمن بقاعدة البيانات");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setLoading(false);
      toast.error("بيانات الدخول غير صحيحة أو الحساب غير مفعّل");
      return;
    }

    const session = await getVerifiedSupabaseSession();
    if (!session) {
      await supabase.auth.signOut();
      clearAuthSession();
      setLoading(false);
      toast.error("الحساب غير مربوط بفرع وصلاحية نشطة");
      return;
    }

    await hydrateStoreFromSupabase(session);
    toast.success(`مرحباً ${session.name}`);
    router.replace(getSafeReturnPath());
    router.refresh();
  };

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background p-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -start-32 -top-32 size-96 rounded-full bg-gold-400/10 blur-3xl" />
        <div className="absolute -bottom-32 -end-32 size-96 rounded-full bg-caramel-500/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-5 flex w-full max-w-[280px] items-center justify-center">
            <Image
              src="/images/valentino-logo.png"
              alt="Valentino Chocolate"
              width={1024}
              height={338}
              priority
              className="h-auto w-full object-contain drop-shadow-[0_8px_24px_rgba(36,24,12,0.12)]"
            />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            نظام إدارة الشوكولاتة الفاخرة — ليبيا
          </p>
        </div>

        <Card className="border-cacao-800/10 bg-card/80 shadow-xl backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">تسجيل الدخول</CardTitle>
            <CardDescription>
              أدخل بياناتك للوصول إلى لوحة التحكم
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@valentino.ly"
                  autoComplete="email"
                  dir="ltr"
                  className="text-start"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  dir="ltr"
                  className="text-start"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    <span>جاري تسجيل الدخول...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="size-4" aria-hidden />
                    دخول آمن
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          ليس لديك حساب؟{" "}
          <Link
            href="/register"
            className="font-medium text-gold-600 hover:underline"
          >
            إنشاء حساب جديد
          </Link>
        </p>

        <p className="text-center text-xs text-muted-foreground">
          جلسة مشفرة وصلاحيات مرتبطة بالفرع عبر Supabase
        </p>
      </div>
    </div>
  );
}
