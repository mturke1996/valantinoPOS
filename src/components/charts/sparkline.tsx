"use client";

import { useId } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

import { CHART_COLORS } from "./chart-theme";

export interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  className?: string;
}

/**
 * Tiny gradient area sparkline for KPI cards. Pads a single point so a flat
 * baseline still renders. aria-hidden — decorative trend only.
 */
export function Sparkline({
  data,
  color = CHART_COLORS.gold,
  height = 44,
  className,
}: SparklineProps) {
  const id = useId();
  const gradId = `spark-${id}`;

  const points = data.map((value, i) => ({ i, value }));
  if (points.length === 1) {
    points.push({ i: 1, value: points[0]!.value });
  }
  if (points.length === 0) return null;

  return (
    <div className={className} style={{ height }} aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={points}
          margin={{ top: 3, right: 0, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradId})`}
            isAnimationActive
            animationDuration={600}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
