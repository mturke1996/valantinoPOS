"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartTooltip } from "./chart-tooltip";
import { SERIES_PALETTE, formatCompact } from "./chart-theme";

export interface TopProductsChartProps {
  data: Array<{ name: string; value: number }>;
  height?: number;
  valueLabel?: string;
}

/**
 * Horizontal rounded bars for top products by revenue. Each bar gets a
 * distinct brand color from the sequential palette.
 */
export function TopProductsChart({
  data,
  height = 280,
  valueLabel = "الإيراد",
}: TopProductsChartProps) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
        >
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatCompact}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
            tickLine={false}
            axisLine={false}
            width={108}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted))", opacity: 0.35 }}
            content={<ChartTooltip money title={valueLabel} />}
          />
          <Bar
            dataKey="value"
            radius={[0, 8, 8, 0]}
            maxBarSize={26}
            isAnimationActive
            animationDuration={700}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={SERIES_PALETTE[i % SERIES_PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
