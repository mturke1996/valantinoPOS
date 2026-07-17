"use client";

import { useState } from "react";
import { ChevronDown, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  AUDIT_TONE_STYLES,
} from "@/lib/constants/audit";
import type { PresentedAuditLog } from "@/lib/audit/present-audit-log";
import { cn, formatDateTime } from "@/lib/utils";

interface AuditTimelineProps {
  groups: {
    dayKey: string;
    dayLabel: string;
    items: PresentedAuditLog[];
  }[];
}

function AuditDetailRows({
  rows,
}: {
  rows: PresentedAuditLog["detailRows"];
}) {
  if (rows.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">لا توجد تفاصيل إضافية</p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-cacao-800/8 bg-cream-50/50">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-cacao-800/8 text-muted-foreground">
            <th className="px-3 py-2 text-start font-medium">الحقل</th>
            <th className="px-3 py-2 text-start font-medium">قبل</th>
            <th className="px-3 py-2 text-start font-medium">بعد</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={`${row.label}-${row.oldValue ?? ""}-${row.newValue ?? ""}`}
              className="border-b border-cacao-800/6 last:border-0"
            >
              <td className="px-3 py-2 font-medium text-foreground">
                {row.label}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {row.oldValue ?? "—"}
              </td>
              <td className="px-3 py-2 text-foreground">
                {row.newValue ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AuditLogItem({ item }: { item: PresentedAuditLog }) {
  const [open, setOpen] = useState(false);
  const Icon = item.icon;
  const tone = AUDIT_TONE_STYLES[item.tone];

  return (
    <li className="relative ps-10">
      <span
        aria-hidden
        className={cn(
          "absolute start-[1.15rem] top-5 size-2.5 -translate-x-1/2 rounded-full ring-4 ring-background rtl:translate-x-1/2",
          tone.dot,
        )}
      />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full rounded-xl border border-cacao-800/8 bg-card p-3 text-start transition-all",
          "hover:border-cacao-800/15 hover:bg-cream-50/40",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          open && "border-gold-400/30 bg-gold-400/[0.03] shadow-sm",
        )}
        aria-expanded={open}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg",
              tone.icon,
            )}
          >
            <Icon className="size-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold leading-snug text-foreground">
                {item.title}
              </p>
              <Badge
                variant="outline"
                className={cn("text-[10px] font-medium", tone.badge)}
              >
                {item.entityTypeLabel}
              </Badge>
              <span className="ms-auto flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
                {item.timeLabel}
                <ChevronDown
                  className={cn(
                    "size-3.5 transition-transform duration-200",
                    open && "rotate-180",
                  )}
                />
              </span>
            </div>

            <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">
              {item.summary}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <UserRound className="size-3.5 opacity-70" />
                {item.actorName}
              </span>
              <span className="font-mono text-[11px] opacity-80">
                {item.entityLabel}
              </span>
              <span className="hidden sm:inline">
                {formatDateTime(item.createdAt)}
              </span>
            </div>

            {open ? (
              <div
                className="mt-3 animate-fade-up space-y-2"
                onClick={(e) => e.stopPropagation()}
              >
                <AuditDetailRows rows={item.detailRows} />
                <p className="font-mono text-[10px] text-muted-foreground/80">
                  {item.action} · {item.entityId}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </button>
    </li>
  );
}

export function AuditTimeline({ groups }: AuditTimelineProps) {
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.dayKey} className="space-y-3">
          <div className="sticky top-0 z-10 -mx-1 flex items-center gap-3 bg-background/90 px-1 py-1.5 backdrop-blur-sm">
            <h2 className="text-sm font-semibold text-cacao-800">
              {group.dayLabel}
            </h2>
            <div className="h-px flex-1 bg-cacao-800/8" />
            <span className="text-xs tabular-nums text-muted-foreground">
              {group.items.length.toLocaleString("ar-LY")}
            </span>
          </div>

          <ol className="relative space-y-3 before:absolute before:start-5 before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-cacao-800/15 before:via-cacao-800/10 before:to-transparent before:content-['']">
            {group.items.map((item) => (
              <AuditLogItem key={item.id} item={item} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
