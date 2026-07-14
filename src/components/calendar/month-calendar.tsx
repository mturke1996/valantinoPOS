"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { arSA } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MonthCalendarProps {
  month: Date;
  onMonthChange: (date: Date) => void;
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  countsByDay: Map<string, number>;
  typeCountsByDay?: Map<string, DayTypeCounts>;
}

export type CalendarMarkerType =
  | "delivery"
  | "event"
  | "reservation"
  | "other";
export type DayTypeCounts = Partial<Record<CalendarMarkerType, number>>;

const WEEKDAYS = ["سبت", "أحد", "إثن", "ثلا", "أرب", "خمي", "جمع"];

const DAY_FILL: Record<CalendarMarkerType, string> = {
  delivery: "bg-pistachio-400/25 text-cacao-950 ring-pistachio-400/35",
  event: "bg-gold-400/30 text-cacao-950 ring-gold-400/40",
  reservation: "bg-berry-500/20 text-cacao-950 ring-berry-500/30",
  other: "bg-cacao-800/15 text-cacao-950 ring-cacao-800/25",
};

const MARKERS: Array<{ type: CalendarMarkerType; className: string }> = [
  { type: "delivery", className: "bg-pistachio-400" },
  { type: "event", className: "bg-gold-400" },
  { type: "reservation", className: "bg-berry-500" },
  { type: "other", className: "bg-cacao-800" },
];

function dominantType(typeCounts?: DayTypeCounts): CalendarMarkerType | null {
  if (!typeCounts) return null;
  let best: CalendarMarkerType | null = null;
  let bestCount = 0;
  for (const marker of MARKERS) {
    const count = typeCounts[marker.type] ?? 0;
    if (count > bestCount) {
      best = marker.type;
      bestCount = count;
    }
  }
  return best;
}

export function MonthCalendar({
  month,
  onMonthChange,
  selectedDate,
  onSelectDate,
  countsByDay,
  typeCountsByDay,
}: MonthCalendarProps) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 6 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 6 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div className="rounded-2xl border border-cacao-800/8 bg-card p-3 sm:p-4">
      <div className="mb-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onMonthChange(subMonths(month, 1))}
          aria-label="الشهر السابق"
        >
          <ChevronRight className="size-4" />
        </Button>
        <h3 className="text-base font-semibold tracking-tight">
          {format(month, "MMMM yyyy", { locale: arSA })}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onMonthChange(addMonths(month, 1))}
          aria-label="الشهر التالي"
        >
          <ChevronLeft className="size-4" />
        </Button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="py-1 text-center text-[11px] font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const count = countsByDay.get(key) ?? 0;
          const typeCounts = typeCountsByDay?.get(key);
          const selected = selectedDate ? isSameDay(day, selectedDate) : false;
          const inMonth = isSameMonth(day, month);
          const isToday = isSameDay(day, new Date());
          const tone = dominantType(typeCounts);
          const hasOrders = count > 0;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(day)}
              aria-label={`${format(day, "EEEE d MMMM yyyy", { locale: arSA })}${count > 0 ? `، ${count} طلب` : ""}`}
              className={cn(
                "relative flex min-h-12 flex-col items-center justify-center rounded-xl border text-sm transition-[transform,box-shadow,background-color] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97] sm:min-h-14",
                inMonth
                  ? "border-cacao-800/8 bg-background"
                  : "border-transparent bg-muted/25 text-muted-foreground/55",
                hasOrders &&
                  inMonth &&
                  (tone
                    ? DAY_FILL[tone]
                    : "bg-gold-400/25 text-cacao-950 ring-1 ring-gold-400/35"),
                hasOrders && inMonth && "font-semibold ring-1",
                selected &&
                  "z-[1] border-cacao-800/20 shadow-[0_8px_24px_-12px_rgba(61,43,31,0.45)] ring-2 ring-cacao-800/30",
                isToday &&
                  !selected &&
                  !hasOrders &&
                  "ring-1 ring-caramel-500/45",
                isToday && hasOrders && "outline outline-2 outline-offset-1 outline-cacao-800/40",
              )}
            >
              <span className="font-mono tabular-nums leading-none">
                {format(day, "d")}
              </span>
              {hasOrders ? (
                <span className="mt-1 flex items-center gap-0.5">
                  <span className="rounded-full bg-cacao-950/80 px-1.5 py-px text-[9px] font-bold tabular-nums text-cream-50">
                    {count}
                  </span>
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function dayKeyFromOrder(deliveryDate: string): string {
  return format(parseISO(deliveryDate), "yyyy-MM-dd");
}
