"use client";

import { useCallback, useState } from "react";
import { Save, Settings } from "lucide-react";
import { toast } from "sonner";

import { ImageUploadField } from "@/components/shared/image-upload-field";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useStoreSubscription } from "@/hooks/use-store-subscription";
import { getSettings, updateSettings } from "@/lib/data/store";
import type { Settings as AppSettings } from "@/types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(() => {
    setSettings(getSettings());
    setLoading(false);
  }, []);

  useStoreSubscription(refresh);

  const handleSave = () => {
    if (!settings) return;
    setSaving(true);
    updateSettings(settings);
    toast.success("تم حفظ الإعدادات ومزامنتها");
    setSaving(false);
  };

  const update = (patch: Partial<AppSettings>) => {
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  if (loading || !settings) {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      <PageHeader
        title="الإعدادات"
        description="إعدادات المتجر — تُحفظ محلياً وتُزامَن مع السحابة"
        actions={
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="size-4" />
            {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
          </Button>
        }
      />

      <Card className="border-cacao-800/8 shadow-none">
        <CardContent className="pt-6">
          <ImageUploadField
            label="شعار المتجر"
            value={settings.logoUrl}
            onChange={(url) => update({ logoUrl: url })}
            uploadName="valentino-logo"
            previewAlt={settings.branchName}
            disabled={saving}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-cacao-800/8 shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="size-4" />
              معلومات المتجر
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="branchName">اسم المتجر</Label>
              <Input
                id="branchName"
                value={settings.branchName}
                onChange={(e) => update({ branchName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branchAddress">العنوان</Label>
              <Input
                id="branchAddress"
                value={settings.branchAddress}
                onChange={(e) => update({ branchAddress: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">الدولة</Label>
              <Input
                id="country"
                value={settings.country}
                onChange={(e) => update({ country: e.target.value })}
                placeholder="ليبيا"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branchPhone">الهاتف</Label>
              <Input
                id="branchPhone"
                value={settings.branchPhone}
                onChange={(e) => update({ branchPhone: e.target.value })}
                dir="ltr"
                className="text-start"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-cacao-800/8 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">المالية والضريبة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="taxRate">نسبة الضريبة (%)</Label>
              <Input
                id="taxRate"
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={settings.taxRate}
                onChange={(e) =>
                  update({ taxRate: parseFloat(e.target.value) || 0 })
                }
                dir="ltr"
                className="text-start"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">العملة</Label>
              <Input
                id="currency"
                value={settings.currency}
                onChange={(e) => update({ currency: e.target.value })}
                dir="ltr"
                className="text-start"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currencySymbol">رمز العملة</Label>
              <Input
                id="currencySymbol"
                value={settings.currencySymbol}
                onChange={(e) => update({ currencySymbol: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-cacao-800/8 shadow-none lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">الولاء والترقيم</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="loyaltyPoints">نقاط لكل دينار</Label>
              <Input
                id="loyaltyPoints"
                type="number"
                value={settings.loyaltyPointsPerSar}
                onChange={(e) =>
                  update({
                    loyaltyPointsPerSar: parseFloat(e.target.value) || 0,
                  })
                }
                dir="ltr"
                className="text-start"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orderPrefix">بادئة رقم الطلب</Label>
              <Input
                id="orderPrefix"
                value={settings.orderNumberPrefix}
                onChange={(e) =>
                  update({ orderNumberPrefix: e.target.value })
                }
                dir="ltr"
                className="text-start"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
