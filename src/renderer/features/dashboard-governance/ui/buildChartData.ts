import { FALLBACK_COLORS } from '@/shared/ui/chart-constants';

export type ChartDatum = {
  name: string;
  value: number;
  percent: number;
  fill: string;
};

/**
 * Builds pie chart data from rows that have a fiat value. Filters out
 * zero-value entries and assigns colors from FALLBACK_COLORS.
 */
export function buildChartData<T>(rows: T[], getName: (row: T) => string, getValue: (row: T) => number): ChartDatum[] {
  const total = rows.reduce((sum, r) => sum + getValue(r), 0);

  return rows
    .map((row, i) => ({
      name: getName(row),
      value: getValue(row),
      percent: total > 0 ? (getValue(row) / total) * 100 : 0,
      fill: FALLBACK_COLORS[i % FALLBACK_COLORS.length] ?? FALLBACK_COLORS[0],
    }))
    .filter((d) => d.value > 0);
}
