"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { ChartTooltip } from "./chart-tooltip";

export interface StatusDonutSlice {
  label: string;
  value: number;
  color: string;
}

export interface StatusDonutProps {
  data: StatusDonutSlice[];
  height?: number;
  centerLabel?: string;
  centerValue?: string;
}

/**
 * Donut chart with a custom side legend and a centered total readout.
 * Slices are rounded and slightly padded for a refined look.
 */
export function StatusDonut({
  data,
  height = 240,
  centerLabel = "إجمالي الطلبات",
  centerValue,
}: StatusDonutProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const slices = data.filter((d) => d.value > 0);

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div
        style={{ height, width: height }}
        className="relative shrink-0"
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              content={<ChartTooltip money={false} title="الطلبات" />}
            />
            <Pie
              data={slices}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius="62%"
              outerRadius="100%"
              paddingAngle={2}
              cornerRadius={6}
              stroke="hsl(var(--card))"
              strokeWidth={2}
              isAnimationActive
              animationDuration={700}
            >
              {slices.map((slice, i) => (
                <Cell key={i} fill={slice.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums text-foreground">
            {centerValue ?? total}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {centerLabel}
          </span>
        </div>
      </div>

      <ul className="grid w-full grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
        {data.map((slice) => {
          const pct =
            total > 0 ? Math.round((slice.value / total) * 100) : 0;
          return (
            <li
              key={slice.label}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: slice.color }}
                />
                <span className="truncate text-foreground/80">
                  {slice.label}
                </span>
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {slice.value}
                <span className="mx-1 text-foreground/30">·</span>
                {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
