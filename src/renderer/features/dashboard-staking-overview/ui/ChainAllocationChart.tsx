import { Pie, PieChart, Tooltip } from 'recharts';

import { getColorByPriceId } from '@/shared/ui/chart-constants';

import { ChartTooltip } from './ChartTooltip';

type ChainEntry = {
  chainName: string;
  fiatValue: string;
  priceId: string;
};

type ChartEntry = {
  name: string;
  value: number;
  percent: number;
  fill: string;
};

type Props = {
  chains: ChainEntry[];
};

export const ChainAllocationChart = ({ chains }: Props) => {
  const filtered = chains
    .map((c, i) => ({
      name: c.chainName,
      value: parseFloat(c.fiatValue),
      fill: getColorByPriceId(c.priceId, i),
    }))
    .filter((d) => d.value > 0);

  const total = filtered.reduce((sum, d) => sum + d.value, 0);
  const data: ChartEntry[] = filtered.map((d) => ({
    ...d,
    percent: total > 0 ? (d.value / total) * 100 : 0,
  }));

  if (data.length === 0) return null;

  return (
    <PieChart width={160} height={160}>
      <Pie data={data} innerRadius={50} outerRadius={75} dataKey="value" stroke="none" animationDuration={400} />
      <Tooltip content={<ChartTooltip />} />
    </PieChart>
  );
};
