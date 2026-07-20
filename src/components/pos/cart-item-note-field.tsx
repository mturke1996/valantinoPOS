"use client";

import { useEffect, useId, useState } from "react";
import { ChevronUp, PenLine, StickyNote } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const MAX_LENGTH = 240;

interface CartItemNoteFieldProps {
  value: string;
  onChange: (value: string) => void;
  productName: string;
  compact?: boolean;
  /** Keep editor visible (forms like event creation) */
  pinned?: boolean;
}

export function CartItemNoteField({
  value,
  onChange,
  productName,
  compact = false,
  pinned = false,
}: CartItemNoteFieldProps) {
  const fieldId = useId();
  const trimmed = value.trim();
  const [open, setOpen] = useState(pinned || Boolean(trimmed));
  const remaining = MAX_LENGTH - value.length;
  const isOpen = pinned || open;

  useEffect(() => {
    if (trimmed && !pinned) setOpen(true);
  }, [trimmed, pinned]);

  const shellClass = cn(
    "overflow-hidden rounded-xl border border-cacao-800/10 bg-white",
    "shadow-[inset_3px_0_0_0_rgba(204,168,80,0.85)]",
    compact ? "text-[11px]" : "text-xs",
  );

  const editor = (
    <div className={shellClass}>
      <div className="flex items-center justify-between gap-3 border-b border-cacao-800/8 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-gold-400/12 text-gold-400">
            <StickyNote className="size-3.5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <label
              htmlFor={fieldId}
              className="block truncate text-[11px] font-semibold text-foreground"
            >
              ملاحظة الصنف
            </label>
            <p className="truncate text-[10px] text-muted-foreground">
              {productName}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span
            className={cn(
              "text-[10px] tabular-nums",
              remaining < 30 ? "text-caramel-500" : "text-muted-foreground",
            )}
          >
            {value.length}/{MAX_LENGTH}
          </span>
          {!pinned ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => setOpen(false)}
              aria-label="طي الملاحظة"
            >
              <ChevronUp className="size-3.5" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="space-y-2 px-3 py-2.5">
        <Textarea
          id={fieldId}
          value={value}
          onChange={(event) =>
            onChange(event.target.value.slice(0, MAX_LENGTH))
          }
          placeholder="تفاصيل التحضير، التغليف، أو تخصيص هذا الصنف…"
          rows={compact ? 2 : 3}
          className={cn(
            "min-h-[3.25rem] resize-none border-0 bg-cacao-800/[0.02] px-3 py-2.5 text-xs leading-relaxed shadow-none",
            "focus-visible:ring-1 focus-visible:ring-gold-400/35",
          )}
        />
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          تُطبع بجانب اسم الصنف في الفاتورة والتجهيز.
        </p>
      </div>
    </div>
  );

  if (pinned) {
    return editor;
  }

  return (
    <div className="mt-2.5">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "flex w-full items-start gap-2.5 rounded-xl border px-3 py-2.5 text-start transition-all",
            "active:scale-[0.995]",
            trimmed
              ? "border-gold-400/25 bg-gradient-to-l from-gold-400/[0.07] via-white to-white hover:border-gold-400/40"
              : "border-dashed border-cacao-800/12 bg-cacao-800/[0.015] hover:border-gold-400/25 hover:bg-gold-400/[0.03]",
          )}
        >
          {trimmed ? (
            <>
              <span className="mt-0.5 shrink-0 rounded-md bg-gold-400 px-1.5 py-0.5 text-[9px] font-bold text-white">
                ملاحظة
              </span>
              <span className="min-w-0 flex-1 text-[11px] leading-snug text-foreground">
                {trimmed}
              </span>
              <PenLine
                className="mt-0.5 size-3.5 shrink-0 text-gold-400"
                strokeWidth={1.75}
              />
            </>
          ) : (
            <>
              <PenLine
                className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                strokeWidth={1.75}
              />
              <span className="text-[11px] font-medium text-muted-foreground">
                إضافة ملاحظة للصنف
              </span>
            </>
          )}
        </button>
      ) : (
        editor
      )}
    </div>
  );
}
