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
}

const WEEKDAYS = ["سبت", "أحد", "إثن", "ثلا", "أرب", "خمي", "جمع"];

export function MonthCalendar({
  month,
  onMonthChange,
  selectedDate,
  onSelectDate,
  countsByDay,
}: MonthCalendarProps) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 6 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 6 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div className="rounded-xl border border-cacao-800/8 bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onMonthChange(subMonths(month, 1))}
          aria-label="الشهر السابق"
        >
          <ChevronRight className="size-4" />
        </Button>
        <h3 className="text-base font-semibold">
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
          const selected = selectedDate ? isSameDay(day, selectedDate) : false;
          const inMonth = isSameMonth(day, month);
          const isToday = isSameDay(day, new Date());

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(day)}
              aria-label={`${format(day, "EEEE d MMMM yyyy", { locale: arSA })}${count > 0 ? `، ${count} طلب` : ""}`}
              className={cn(
                "relative flex min-h-11 flex-col items-center justify-center rounded-lg border text-sm transition-colors",
                inMonth
                  ? "border-cacao-800/8 bg-background hover:border-gold-400/30"
                  : "border-transparent bg-muted/30 text-muted-foreground/60",
                selected && "border-gold-400/50 bg-gold-400/10",
                isToday && !selected && "ring-1 ring-caramel-500/40",
              )}
            >
              <span className="font-mono tabular-nums">{format(day, "d")}</span>
              {count > 0 ? (
                <span className="absolute bottom-1 flex gap-0.5">
                  {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                    <span
                      key={i}
                      className="size-1 rounded-full bg-gold-400"
                    />
                  ))}
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
