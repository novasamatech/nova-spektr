import { Cell, Pie, PieChart, Tooltip } from 'recharts';

import { formatBalance } from '@/shared/lib/utils';

import { CHART_TOOLTIP_STYLE } from './chartConstants';
import { type Holding } from './useHoldings';

type Props = {
  holdings: Holding[];
  colors: string[];
};

type ChartEntry = {
  name: string;
  value: number;
  percent: number;
  index: number;
  holding: Holding;
};

type TooltipPayloadItem = {
  payload: ChartEntry;
};

const ChartTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) => {
  if (!active || !payload?.length) return null;

  const item = payload[0];
  if (!item) return null;

  const { holding } = item.payload;
  const { formatted, suffix } = formatBalance(holding.totalRaw, holding.precision);

  return (
    <div style={CHART_TOOLTIP_STYLE}>
      <div style={{ fontWeight: 600 }}>{holding.symbol}</div>
      <div>
        {formatted}
        {suffix} {holding.symbol}
      </div>
      <div>{item.payload.percent.toFixed(1)}%</div>
    </div>
  );
};

export const AllocationChart = ({ holdings, colors }: Props) => {
  const filtered = holdings
    .map((h, i) => ({ name: h.symbol, value: parseFloat(h.fiatValue), index: i, holding: h }))
    .filter((d) => d.value > 0);

  const total = filtered.reduce((sum, d) => sum + d.value, 0);
  const data: ChartEntry[] = filtered.map((d) => ({
    ...d,
    percent: total > 0 ? (d.value / total) * 100 : 0,
  }));

  if (data.length === 0) return null;

  return (
    <PieChart width={140} height={140}>
      <Pie data={data} innerRadius={45} outerRadius={65} dataKey="value" stroke="none">
        {data.map((entry) => (
          <Cell key={entry.name} fill={colors[entry.index % colors.length]} />
        ))}
      </Pie>
      <Tooltip content={<ChartTooltip />} />
    </PieChart>
  );
};
