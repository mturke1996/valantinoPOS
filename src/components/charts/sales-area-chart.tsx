"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartTooltip } from "./chart-tooltip";
import { CHART_COLORS, formatCompact } from "./chart-theme";

export interface SalesAreaChartProps {
  data: Array<{ label: string; value: number }>;
  height?: number;
  color?: string;
  valueLabel?: string;
}

/**
 * Smooth-curve area chart with a soft gradient fill under the line.
 * Used as the hero revenue-over-time chart.
 */
export function SalesAreaChart({
  data,
  height = 320,
  color = CHART_COLORS.gold,
  valueLabel = "المبيعات",
}: SalesAreaChartProps) {
  const id = useId();
  const gradId = `area-${id}`;

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 12, right: 12, bottom: 0, left: -8 }}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.38} />
              <stop offset="55%" stopColor={color} stopOpacity={0.14} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
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
            minTickGap={18}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={formatCompact}
          />
          <Tooltip
            cursor={{ stroke: color, strokeOpacity: 0.25, strokeWidth: 1 }}
            content={<ChartTooltip money title={valueLabel} />}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#${gradId})`}
            isAnimationActive
            animationDuration={700}
            dot={false}
            activeDot={{
              r: 4,
              strokeWidth: 2,
              stroke: "hsl(var(--card))",
              fill: color,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
