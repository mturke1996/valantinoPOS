"use client";

import { useMemo, useState } from "react";
import { Eye } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  buildTelegramPreviewMessage,
  type TelegramPreviewKind,
} from "@/lib/telegram/messages";
import { cn } from "@/lib/utils";

const PREVIEW_TABS: Array<{ kind: TelegramPreviewKind; label: string }> = [
  { kind: "reminder_3d", label: "قبل 3 أيام" },
  { kind: "reminder_2d", label: "قبل يومين" },
  { kind: "reminder_1d", label: "غداً" },
  { kind: "reminder_today", label: "اليوم" },
  { kind: "order", label: "طلب جديد" },
  { kind: "payment", label: "دفعة" },
  { kind: "digest", label: "ملخص" },
];

/**
 * Preview markup from controlled Telegram templates.
 * User-facing values are already HTML-escaped in the formatters;
 * only our <b>/<i> tags remain, so newlines alone need conversion.
 */
function telegramHtmlToSafeHtml(text: string): string {
  return text.replaceAll("\n", "<br />");
}

export function TelegramMessagePreview({ className }: { className?: string }) {
  const [kind, setKind] = useState<TelegramPreviewKind>("reminder_3d");

  const html = useMemo(
    () => telegramHtmlToSafeHtml(buildTelegramPreviewMessage(kind)),
    [kind],
  );

  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border border-cacao-800/8 bg-gradient-to-br from-cacao-800/[0.03] to-gold-400/[0.04] p-4",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Eye className="size-4 text-gold-400" />
          <p className="text-sm font-medium">معاينة شكل الرسائل</p>
        </div>
        <Badge variant="outline" className="text-[10px]">
          مثال توضيحي
        </Badge>
      </div>

      <p className="text-xs leading-5 text-muted-foreground">
        هكذا تظهر رسائل المناسبات والتذكيرات والتنبيهات على تلجرام قبل الإرسال
        الفعلي.
      </p>

      <div className="flex flex-wrap gap-1.5">
        {PREVIEW_TABS.map((tab) => (
          <Button
            key={tab.kind}
            type="button"
            size="sm"
            variant={kind === tab.kind ? "default" : "outline"}
            className="h-8 rounded-full px-3 text-xs"
            onClick={() => setKind(tab.kind)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="mx-auto max-w-md rounded-[1.35rem] bg-[#0e1621] p-3 shadow-inner">
        <div className="mb-2 flex items-center gap-2 px-1">
          <span className="flex size-7 items-center justify-center rounded-full bg-gold-400/20 text-xs">
            🍫
          </span>
          <div>
            <p className="text-xs font-medium text-white/90">Valentino Bot</p>
            <p className="text-[10px] text-white/45">معاينة الرسالة</p>
          </div>
        </div>
        <div
          className="rounded-2xl rounded-tr-md bg-[#182533] px-3.5 py-3 text-[13px] leading-6 text-[#e7ecf1] shadow-sm [&_b]:font-semibold [&_b]:text-white [&_i]:text-white/70"
          dir="rtl"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}
