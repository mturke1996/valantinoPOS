"use client";

import { Delete } from "lucide-react";

import { cn } from "@/lib/utils";

interface PosNumpadProps {
  value: string;
  onDigit: (digit: string) => void;
  onClear: () => void;
  onBackspace: () => void;
  className?: string;
}

const KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["clear", "0", "back"],
] as const;

export function PosNumpad({
  value,
  onDigit,
  onClear,
  onBackspace,
  className,
}: PosNumpadProps) {
  const display = value.length > 0 ? value : "1";
  const pending = value.length > 0;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2 rounded-md border border-cacao-800/10 bg-background px-2.5 py-1">
        <p className="text-[11px] text-muted-foreground">الكمية</p>
        <p
          className={cn(
            "font-mono text-base font-bold tabular-nums leading-none",
            pending ? "text-foreground" : "text-muted-foreground",
          )}
          dir="ltr"
        >
          × {display}
        </p>
        {pending ? (
          <button
            type="button"
            onClick={onClear}
            className="rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-cacao-800/5"
          >
            مسح
          </button>
        ) : (
          <span className="w-8" />
        )}
      </div>

      <div className="grid grid-cols-3 gap-1" dir="ltr">
        {KEYS.flat().map((key) => {
          if (key === "clear") {
            return (
              <button
                key={key}
                type="button"
                onClick={onClear}
                className="pos-numpad-key text-xs font-semibold text-caramel-600"
                aria-label="مسح الكمية"
              >
                C
              </button>
            );
          }
          if (key === "back") {
            return (
              <button
                key={key}
                type="button"
                onClick={onBackspace}
                className="pos-numpad-key"
                aria-label="حذف الرقم الأخير"
              >
                <Delete className="size-3.5" />
              </button>
            );
          }
          return (
            <button
              key={key}
              type="button"
              onClick={() => onDigit(key)}
              className="pos-numpad-key font-mono text-sm font-semibold tabular-nums"
            >
              {key}
            </button>
          );
        })}
      </div>
    </div>
  );
}
