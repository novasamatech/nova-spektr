import { useMemo } from 'react';
import { Cell, Pie, PieChart, Tooltip } from 'recharts';

import { type CurrencyItem } from '@/shared/api/price-provider';
import { useI18n } from '@/shared/i18n';
import { FootnoteText } from '@/shared/ui';

import { Price } from './Price';
import { CHART_TOOLTIP_STYLE, FALLBACK_COLORS, getChainColor } from './chartConstants';
import { type ChainHolding } from './useChainHoldings';

type ChartEntry = {
  name: string;
  value: number;
  percent: number;
  index: number;
};

type TooltipPayloadItem = {
  payload: ChartEntry;
};

const ChartTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) => {
  if (!active || !payload?.length) return null;

  const item = payload[0];
  if (!item) return null;

  return (
    <div style={CHART_TOOLTIP_STYLE}>
      <div style={{ fontWeight: 600 }}>{item.payload.name}</div>
      <div>{item.payload.percent.toFixed(1)}%</div>
    </div>
  );
};

type Props = {
  chainHoldings: ChainHolding[];
  currency: CurrencyItem | null;
  onSelect?: (chainHolding: ChainHolding) => void;
};

export const ChainHoldingsList = ({ chainHoldings, currency, onSelect }: Props) => {
  const { t } = useI18n();

  const colors = useMemo(() => chainHoldings.map((_, i) => getChainColor(i)), [chainHoldings]);

  const chartData = useMemo<ChartEntry[]>(() => {
    const filtered = chainHoldings
      .map((h, i) => ({ name: h.chainName, value: parseFloat(h.fiatValue), index: i }))
      .filter((d) => d.value > 0);

    const total = filtered.reduce((sum, d) => sum + d.value, 0);

    return filtered.map((d) => ({ ...d, percent: total > 0 ? (d.value / total) * 100 : 0 }));
  }, [chainHoldings]);

  return (
    <div>
      <FootnoteText className="text-text-tertiary">{t('dashboard.totalBalance.holdingsByChain')}</FootnoteText>

      <div className="mt-3 flex items-center gap-4">
        <div className="shrink-0">
          {chartData.length > 0 && (
            <PieChart width={180} height={180}>
              <Pie data={chartData} innerRadius={55} outerRadius={85} dataKey="value" stroke="none">
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={colors[entry.index % colors.length]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          )}
        </div>

        <div className="min-w-0 flex-1 overflow-y-auto" style={{ maxHeight: 180 }}>
          <div className="flex flex-col gap-2">
            {chainHoldings.map((holding, index) => (
              <ChainHoldingRow
                key={holding.chainId}
                holding={holding}
                color={colors[index] ?? FALLBACK_COLORS[0]}
                currency={currency}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

type RowProps = {
  holding: ChainHolding;
  color: string;
  currency: CurrencyItem | null;
  onSelect?: (holding: ChainHolding) => void;
};

const ChainHoldingRow = ({ holding, color, currency, onSelect }: RowProps) => {
  return (
    <div
      className="flex cursor-pointer items-center gap-2 rounded py-1 transition-colors hover:bg-hover"
      onClick={() => onSelect?.(holding)}
    >
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <img src={holding.chainIcon} alt={holding.chainName} width={28} height={28} className="shrink-0" />

      <FootnoteText className="min-w-0 flex-1 font-semibold">{holding.chainName}</FootnoteText>

      <div className="shrink-0">
        <FootnoteText align="right" className="font-semibold tabular-nums">
          <Price amount={holding.fiatValue} currency={currency} />
        </FootnoteText>
      </div>
    </div>
  );
};
