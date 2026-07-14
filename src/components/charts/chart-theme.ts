// Brand chart palette — chocolate-luxury tokens mapped to concrete hex
// for recharts (which needs real colors, not Tailwind classes).

export const CHART_COLORS = {
  cacao950: "#1A120B",
  cacao800: "#3D2B1F",
  cacao600: "#5C4033",
  gold: "#D4AF37",
  caramel: "#C4956A",
  pistachio: "#8FB996",
  berry: "#8B3A62",
  cream50: "#FBF7F2",
  cream100: "#F5EDE3",
} as const;

/** Map ORDER_STATUSES `color` token → hex. */
export const STATUS_COLOR_HEX: Record<string, string> = {
  cacao: CHART_COLORS.cacao800,
  caramel: CHART_COLORS.caramel,
  pistachio: CHART_COLORS.pistachio,
  gold: CHART_COLORS.gold,
  berry: CHART_COLORS.berry,
};

/** Sequential palette for multi-series charts. */
export const SERIES_PALETTE = [
  CHART_COLORS.gold,
  CHART_COLORS.caramel,
  CHART_COLORS.pistachio,
  CHART_COLORS.cacao800,
  CHART_COLORS.berry,
  CHART_COLORS.cacao600,
] as const;

/** Compact axis tick formatter: 1200 → "1.2k", 1250000 → "1.25M". */
export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(Math.round(value));
}

/** True when at least one point is positive. */
export function hasPositiveValues(
  data: Array<{ value?: number } | number>,
): boolean {
  return data.some((d) =>
    typeof d === "number" ? d > 0 : (d.value ?? 0) > 0,
  );
}
