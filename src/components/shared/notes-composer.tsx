"use client";

import type { LucideIcon } from "lucide-react";
import { StickyNote } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const DEFAULT_MAX = 500;

export interface NotesComposerProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  description?: string;
  suggestions?: readonly string[];
  maxLength?: number;
  rows?: number;
  icon?: LucideIcon;
  className?: string;
}

export function NotesComposer({
  id,
  label,
  value,
  onChange,
  placeholder = "اكتب أي تفاصيل مهمة للتنفيذ أو التسليم…",
  description,
  suggestions = [],
  maxLength = DEFAULT_MAX,
  rows = 3,
  icon: Icon = StickyNote,
  className,
}: NotesComposerProps) {
  const trimmed = value.trim();
  const remaining = maxLength - value.length;

  const appendSuggestion = (snippet: string) => {
    const next = trimmed ? `${trimmed} · ${snippet}` : snippet;
    onChange(next.slice(0, maxLength));
  };

  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border border-gold-400/20 bg-gold-400/[0.04] p-4",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-gold-400/15 text-gold-400">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <Label htmlFor={id} className="text-sm font-semibold">
            {label}
          </Label>
          {description ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        <span
          className={cn(
            "shrink-0 text-[10px] tabular-nums",
            remaining < 40 ? "text-caramel-500" : "text-muted-foreground",
          )}
        >
          {value.length}/{maxLength}
        </span>
      </div>

      {suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((snippet) => (
            <button
              key={snippet}
              type="button"
              onClick={() => appendSuggestion(snippet)}
              className="rounded-full border border-cacao-800/10 bg-white/80 px-2.5 py-1 text-[11px] font-medium text-cacao-800 transition-colors hover:border-gold-400/40 hover:bg-gold-400/10"
            >
              + {snippet}
            </button>
          ))}
        </div>
      ) : null}

      <Textarea
        id={id}
        value={value}
        onChange={(event) =>
          onChange(event.target.value.slice(0, maxLength))
        }
        placeholder={placeholder}
        rows={rows}
        className="min-h-[4.5rem] resize-y border-cacao-800/10 bg-white/90 text-sm leading-relaxed focus-visible:ring-gold-400/30"
      />

      {trimmed ? (
        <div className="rounded-lg border border-cacao-800/8 bg-white/70 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gold-400/90">
            معاينة
          </p>
          <p className="mt-1 text-xs leading-relaxed text-foreground">
            {trimmed}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export const PREP_NOTE_SUGGESTIONS = [
  "بدون مكسرات",
  "تغليف فاخر",
  "توزيع على طاولات",
  "هش — تعامل بحذر",
  "اتصل قبل التسليم",
] as const;

export const DELIVERY_NOTE_SUGGESTIONS = [
  "اتصل قبل الوصول",
  "بوابة المنزل",
  "تسليم صباحاً",
  "لا يرن الجرس",
] as const;

export const POS_NOTE_SUGGESTIONS = [
  "تغليف هدية",
  "اسم المستلم على البطاقة",
  "بدون سكر",
  "استلام سريع",
] as const;
