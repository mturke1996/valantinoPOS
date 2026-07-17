"use client";

import { useMemo } from "react";
import { QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  buildDocumentCodeValue,
  listDocumentCodeTokens,
} from "@/lib/services/invoice.service";
import type { Invoice, Order, Settings } from "@/types";

const MODE_OPTIONS: Array<{
  value: Settings["documentCodeMode"];
  label: string;
  hint: string;
}> = [
  {
    value: "invoice_data",
    label: "بيانات الفاتورة (JSON)",
    hint: "يشمل اسم المتجر والرقم الضريبي والمبلغ ورقم الفاتورة",
  },
  {
    value: "order_number",
    label: "رقم الطلب فقط",
    hint: "مثال: VAL-2026-0001",
  },
  {
    value: "invoice_number",
    label: "رقم الفاتورة فقط",
    hint: "مثال: INV-2026-0001",
  },
  {
    value: "custom_url",
    label: "رابط مخصص",
    hint: "رابط موقع أو واتساب — يدعم المتغيرات",
  },
  {
    value: "custom_text",
    label: "نص مخصص",
    hint: "أي نص تريد مسحه من الفاتورة",
  },
  {
    value: "hidden",
    label: "إخفاء الكود",
    hint: "لا يظهر أي QR في ملفات PDF",
  },
];

function sampleInvoice(settings: Settings): {
  invoice: Invoice;
  order: Order;
} {
  const now = new Date().toISOString();
  const order: Order = {
    id: "preview-order",
    branchId: settings.branchId,
    orderNumber: `${settings.orderNumberPrefix || "VAL"}-2026-0042`,
    customerId: null,
    type: "pos",
    status: "completed",
    items: [],
    subtotal: 120,
    discountAmount: 0,
    taxAmount: 0,
    total: 120,
    paidAmount: 120,
    paymentStatus: "paid",
    deliveryDate: null,
    deliveryTime: null,
    deliveryAddress: null,
    deliveryFee: 0,
    deliveryZone: null,
    deliveryRecipientName: null,
    deliveryPhone: null,
    deliveryInstructions: null,
    notes: null,
    assignedTo: null,
    shiftId: null,
    createdBy: null,
    couponCode: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  const invoice: Invoice = {
    id: "preview-invoice",
    orderId: order.id,
    invoiceNumber: `${settings.invoiceNumberPrefix || "INV"}-2026-0042`,
    qrPayload: null,
    printedAt: null,
    createdAt: now,
  };
  return { invoice, order };
}

export function DocumentCodeSettingsCard({
  settings,
  onUpdate,
}: {
  settings: Settings;
  onUpdate: (patch: Partial<Settings>) => void;
}) {
  const previewValue = useMemo(() => {
    const { invoice, order } = sampleInvoice(settings);
    return buildDocumentCodeValue({ invoice, order, settings });
  }, [settings]);

  const needsCustom =
    settings.documentCodeMode === "custom_url" ||
    settings.documentCodeMode === "custom_text";

  const enabled =
    settings.documentCodeEnabled !== false &&
    settings.documentCodeMode !== "hidden";

  return (
    <Card className="border-cacao-800/8 shadow-none lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <QrCode className="size-4 text-gold-400" />
          باركود / QR في ملفات PDF
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-start justify-between gap-4 rounded-xl border border-cacao-800/8 p-4">
          <div>
            <Label htmlFor="documentCodeEnabled" className="text-sm">
              إظهار الكود على الفواتير
            </Label>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              يتحكم في ظهور رمز المسح في PDF والطباعة الحرارية
            </p>
          </div>
          <Switch
            id="documentCodeEnabled"
            checked={settings.documentCodeEnabled !== false}
            onCheckedChange={(checked) =>
              onUpdate({ documentCodeEnabled: checked })
            }
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>محتوى الكود</Label>
              <Select
                value={settings.documentCodeMode ?? "invoice_data"}
                onValueChange={(value) =>
                  onUpdate({
                    documentCodeMode: value as Settings["documentCodeMode"],
                  })
                }
                disabled={settings.documentCodeEnabled === false}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {
                  MODE_OPTIONS.find(
                    (o) => o.value === (settings.documentCodeMode ?? "invoice_data"),
                  )?.hint
                }
              </p>
            </div>

            {needsCustom ? (
              <div className="space-y-2">
                <Label htmlFor="documentCodeCustomValue">
                  {settings.documentCodeMode === "custom_url"
                    ? "الرابط المخصص"
                    : "النص المخصص"}
                </Label>
                <Textarea
                  id="documentCodeCustomValue"
                  dir="ltr"
                  className="text-start font-mono text-sm"
                  rows={3}
                  value={settings.documentCodeCustomValue ?? ""}
                  onChange={(e) =>
                    onUpdate({ documentCodeCustomValue: e.target.value })
                  }
                  placeholder={
                    settings.documentCodeMode === "custom_url"
                      ? "https://wa.me/218925620266?text={orderNumber}"
                      : "فاتورة {invoiceNumber} — {branchName}"
                  }
                />
                <div className="flex flex-wrap gap-1.5">
                  {listDocumentCodeTokens().map((token) => (
                    <button
                      key={token}
                      type="button"
                      className="rounded-full border border-cacao-800/10 bg-cacao-800/[0.03] px-2 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors hover:border-gold-400/30 hover:text-foreground"
                      onClick={() =>
                        onUpdate({
                          documentCodeCustomValue: `${settings.documentCodeCustomValue ?? ""}${token}`,
                        })
                      }
                    >
                      {token}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <p className="text-xs leading-5 text-muted-foreground">
              الرقم الضريبي والسجل التجاري (من قسم الفواتير أعلاه) يُضمَّنان عند
              اختيار «بيانات الفاتورة».
            </p>
          </div>

          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-cacao-800/15 bg-cacao-800/[0.02] px-6 py-5">
            <p className="text-xs font-medium text-muted-foreground">معاينة</p>
            {enabled && previewValue ? (
              <>
                <div className="rounded-xl border border-cacao-800/10 bg-white p-3 shadow-sm">
                  <QRCodeSVG value={previewValue} size={132} level="M" />
                </div>
                <p
                  className="max-w-[180px] break-all text-center font-mono text-[10px] leading-4 text-muted-foreground"
                  dir="ltr"
                >
                  {previewValue.length > 120
                    ? `${previewValue.slice(0, 120)}…`
                    : previewValue}
                </p>
              </>
            ) : (
              <p className="max-w-[160px] text-center text-xs text-muted-foreground">
                الكود مخفي — لن يظهر في PDF
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
