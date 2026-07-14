"use client";

import type { ReactNode } from "react";
import { Search } from "lucide-react";

import { CurrencyDisplay } from "@/components/shared/currency-display";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function OpsHero({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-cacao-800/[0.07] bg-gradient-to-br from-white via-cream-50/80 to-gold-400/[0.06] p-4 sm:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-l from-transparent via-gold-400/70 to-transparent"
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          {eyebrow ? (
            <p className="text-[11px] font-semibold tracking-[0.14em] text-gold-400/90 uppercase">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-2xl font-semibold tracking-tight text-cacao-950 sm:text-[1.75rem]">
            {title}
          </h1>
          {description ? (
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto sm:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}

export function OpsKpiGrid({ children }: { children: ReactNode }) {
  return (
    <section className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
      {children}
    </section>
  );
}

export function OpsKpi({
  label,
  value,
  amount,
  active,
  onClick,
  tone = "default",
}: {
  label: string;
  value?: string | number;
  amount?: number;
  active?: boolean;
  onClick?: () => void;
  tone?: "default" | "gold" | "warn" | "ok";
}) {
  const toneClass = {
    default: "border-cacao-800/[0.08] bg-white",
    gold: "border-gold-400/30 bg-gold-400/[0.08]",
    warn: "border-destructive/20 bg-destructive/[0.04]",
    ok: "border-pistachio-400/30 bg-pistachio-400/[0.1]",
  }[tone];

  const Comp = onClick ? "button" : "div";

  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "rounded-2xl border p-3.5 text-start transition-[transform,box-shadow,border-color] duration-200 sm:p-4",
        toneClass,
        onClick && "active:scale-[0.98]",
        active && "ring-2 ring-gold-400/35 shadow-[0_10px_28px_-20px_rgba(61,43,31,0.45)]",
        onClick && !active && "hover:border-gold-400/25",
      )}
    >
      <p className="text-[11px] font-medium text-muted-foreground sm:text-xs">
        {label}
      </p>
      {amount !== undefined ? (
        <CurrencyDisplay
          amount={amount}
          className="mt-2 text-lg font-semibold tracking-tight sm:text-xl"
        />
      ) : (
        <p className="mt-2 font-mono text-xl font-semibold tabular-nums tracking-tight sm:text-2xl">
          {value}
        </p>
      )}
    </Comp>
  );
}

export function OpsFilterRail({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: string; label: string; count?: number }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-colors",
              selected
                ? "bg-cacao-800 text-cream-50 shadow-sm"
                : "bg-white text-muted-foreground ring-1 ring-cacao-800/10 hover:bg-cream-50",
            )}
          >
            {option.label}
            {option.count !== undefined ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 font-mono text-[10px] tabular-nums",
                  selected ? "bg-white/15" : "bg-cacao-800/[0.06]",
                )}
              >
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function OpsSearch({
  value,
  onChange,
  placeholder,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  "aria-label"?: string;
}) {
  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className="h-11 rounded-xl border-cacao-800/10 bg-white ps-10 shadow-none"
      />
    </div>
  );
}

export function OpsToolbar({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-3 rounded-2xl border border-cacao-800/[0.07] bg-white/80 p-3 backdrop-blur-sm sm:p-4">
      {children}
    </div>
  );
}
