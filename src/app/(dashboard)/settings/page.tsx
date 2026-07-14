"use client";

import { useCallback, useState } from "react";
import { ReceiptText, Save, Settings, ShoppingBag, Truck } from "lucide-react";
import { toast } from "sonner";

import { ImageUploadField } from "@/components/shared/image-upload-field";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
              <ShoppingBag className="size-4 text-gold-400" />
              قنوات البيع والورديات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-start justify-between gap-4 rounded-xl border border-cacao-800/8 p-4">
              <div>
                <Label htmlFor="walkInSalesEnabled" className="text-sm">
                  البيع الفوري داخل الفرع
                </Label>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  عند إيقافه تختفي مبيعات الوردية ويبقى التوصيل والمناسبات
                  والحجوزات التي تحتاج إلى تجهيز.
                </p>
              </div>
              <Switch
                id="walkInSalesEnabled"
                checked={settings.walkInSalesEnabled}
                onCheckedChange={(checked) =>
                  update({ walkInSalesEnabled: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border border-cacao-800/10 p-4">
              <div>
                <Label htmlFor="autoWhatsAppOnSale">واتساب بعد البيع</Label>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  بعد إتمام البيع من نقطة البيع يظهر زر مشاركة الفاتورة على واتساب
                  تلقائياً عند توفر رقم العميل.
                </p>
              </div>
              <Switch
                id="autoWhatsAppOnSale"
                checked={settings.autoWhatsAppOnSale}
                onCheckedChange={(checked) =>
                  update({ autoWhatsAppOnSale: checked })
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="defaultDeliveryFee">
                  <Truck className="me-1 inline size-3.5" />
                  سعر التوصيل الافتراضي
                </Label>
                <Input
                  id="defaultDeliveryFee"
                  type="number"
                  min={0}
                  step={0.5}
                  value={settings.defaultDeliveryFee}
                  onChange={(e) =>
                    update({
                      defaultDeliveryFee: Math.max(
                        0,
                        Number.parseFloat(e.target.value) || 0,
                      ),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="freeDeliveryThreshold">
                  توصيل مجاني بعد مبلغ
                </Label>
                <Input
                  id="freeDeliveryThreshold"
                  type="number"
                  min={0}
                  step={1}
                  value={settings.freeDeliveryThreshold ?? ""}
                  placeholder="غير مفعّل"
                  onChange={(e) =>
                    update({
                      freeDeliveryThreshold: e.target.value
                        ? Math.max(0, Number.parseFloat(e.target.value) || 0)
                        : null,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>مناطق التوصيل (طرابلس / بنغازي)</Label>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-cacao-800/10 p-3">
                {settings.deliveryZones.map((zone, index) => (
                  <div
                    key={zone.id}
                    className="grid grid-cols-[1fr_auto] items-center gap-2 text-sm"
                  >
                    <span>
                      {zone.name}
                      <span className="ms-2 text-xs text-muted-foreground">
                        {zone.city}
                      </span>
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      className="h-9 w-24"
                      dir="ltr"
                      value={zone.fee}
                      onChange={(e) => {
                        const fee = Math.max(
                          0,
                          Number.parseFloat(e.target.value) || 0,
                        );
                        const deliveryZones = settings.deliveryZones.map(
                          (z, i) => (i === index ? { ...z, fee } : z),
                        );
                        update({ deliveryZones });
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-cacao-800/8 shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ReceiptText className="size-4 text-gold-400" />
              الفواتير والطباعة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="taxNumber">الرقم الضريبي</Label>
                <Input
                  id="taxNumber"
                  dir="ltr"
                  className="text-start"
                  value={settings.taxNumber ?? ""}
                  onChange={(e) =>
                    update({ taxNumber: e.target.value.trim() || null })
                  }
                  placeholder="اختياري — يظهر في QR الفاتورة"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commercialRegister">السجل التجاري</Label>
                <Input
                  id="commercialRegister"
                  dir="ltr"
                  className="text-start"
                  value={settings.commercialRegister ?? ""}
                  onChange={(e) =>
                    update({
                      commercialRegister: e.target.value.trim() || null,
                    })
                  }
                  placeholder="اختياري"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>عرض ورق الطابعة الحرارية</Label>
                <Select
                  value={String(settings.thermalPaperWidth)}
                  onValueChange={(value) =>
                    update({ thermalPaperWidth: value === "58" ? 58 : 80 })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="80">80 مم</SelectItem>
                    <SelectItem value="58">58 مم</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsappCountryCode">مفتاح واتساب</Label>
                <Input
                  id="whatsappCountryCode"
                  dir="ltr"
                  className="text-start"
                  value={settings.whatsappCountryCode}
                  onChange={(e) =>
                    update({
                      whatsappCountryCode: e.target.value.replace(/\D/g, ""),
                    })
                  }
                  placeholder="218"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoiceFooter">عبارة أسفل الفاتورة</Label>
              <Textarea
                id="invoiceFooter"
                value={settings.invoiceFooter}
                onChange={(e) => update({ invoiceFooter: e.target.value })}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </div>

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
