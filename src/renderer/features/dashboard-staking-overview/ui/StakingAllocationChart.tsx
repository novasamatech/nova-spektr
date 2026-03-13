import { Cell, Pie, PieChart, Tooltip } from 'recharts';

import { ChartTooltip } from './ChartTooltip';
import { getChainColor } from './chartConstants';
import { type ChainStakingSummary } from './useStakingOverview';

type ChartEntry = {
  name: string;
  value: number;
  percent: number;
  color: string;
};

type Props = {
  chains: ChainStakingSummary[];
};

export const StakingAllocationChart = ({ chains }: Props) => {
  const filtered = chains
    .map((c, i) => ({
      name: c.chainName,
      value: parseFloat(c.fiatValue),
      color: getChainColor(c.priceId, i),
    }))
    .filter((d) => d.value > 0);

  const total = filtered.reduce((sum, d) => sum + d.value, 0);
  const data: ChartEntry[] = filtered.map((d) => ({
    ...d,
    percent: total > 0 ? (d.value / total) * 100 : 0,
  }));

  if (data.length < 2) return null;

  return (
    <PieChart width={160} height={160}>
      <Pie data={data} innerRadius={50} outerRadius={75} dataKey="value" stroke="none" animationDuration={400}>
        {data.map((entry) => (
          <Cell key={entry.name} fill={entry.color} />
        ))}
      </Pie>
      <Tooltip content={<ChartTooltip />} />
    </PieChart>
  );
};
