"use client";

import { useId } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartTooltip } from "./chart-tooltip";
import { CHART_COLORS, formatCompact } from "./chart-theme";

export interface SalesBarChartProps {
  data: Array<{ label: string; value: number }>;
  height?: number;
  color?: string;
  valueLabel?: string;
  unit?: string;
  money?: boolean;
}

/**
 * Vertical rounded bar chart — order count or sales by day.
 * Bars use a vertical brand gradient with fully rounded tops.
 */
export function SalesBarChart({
  data,
  height = 280,
  color = CHART_COLORS.caramel,
  valueLabel = "الطلبات",
  unit,
  money = false,
}: SalesBarChartProps) {
  const id = useId();
  const gradId = `bar-${id}`;

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 12, right: 12, bottom: 0, left: -8 }}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={1} />
              <stop offset="100%" stopColor={color} stopOpacity={0.55} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={12}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            width={40}
            allowDecimals={false}
            tickFormatter={money ? formatCompact : undefined}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted))", opacity: 0.45 }}
            content={
              <ChartTooltip money={money} unit={unit} title={valueLabel} />
            }
          />
          <Bar
            dataKey="value"
            fill={`url(#${gradId})`}
            radius={[8, 8, 8, 8]}
            maxBarSize={44}
            isAnimationActive
            animationDuration={700}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
