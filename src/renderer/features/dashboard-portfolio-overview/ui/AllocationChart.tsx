import { memo, useCallback, useState } from 'react';
import { Cell, Pie, PieChart } from 'recharts';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { HelpText, SmallTitleText } from '@/shared/ui';
import { type CurrencyItem } from '@/domains/price';

import { Price } from './Price';

export type AllocationSlice = {
  id: string;
  name: string;
  value: number;
  fiat: string;
  color: string;
  /**
   * Pre-formatted token amount shown on hover, when the slice maps to a single
   * asset
   */
  tokenAmount?: string;
};

type Props = {
  data: AllocationSlice[];
  total: string;
  scopeLabel: string;
  scopeColor?: string;
  countLabelKey: 'assetCount' | 'networkCount';
  currency: CurrencyItem | null;
};

export const AllocationChart = memo(({ data, total, scopeLabel, scopeColor, countLabelKey, currency }: Props) => {
  const { t } = useI18n();
  const [hoverId, setHoverId] = useState<string | null>(null);

  const handleEnter = useCallback((_: unknown, index: number) => setHoverId(data[index]?.id ?? null), [data]);
  const handleLeave = useCallback(() => setHoverId(null), []);

  if (data.length === 0) return null;

  const totalValue = data.reduce((sum, slice) => sum + slice.value, 0);
  // hover is tracked by slice id so it survives data reorders/removals — a stale id resolves to no hover
  const hovered = hoverId === null ? null : (data.find((slice) => slice.id === hoverId) ?? null);
  const hoveredPct = hovered && totalValue > 0 ? ((hovered.value / totalValue) * 100).toFixed(1) : '0.0';
  // one "pct · amount" line fits ~18 chars in the donut hole; longer combos get
  // a deliberate two-line layout instead of an arbitrary mid-amount wrap
  const hoveredSubOneLine =
    hovered?.tokenAmount === undefined || `${hoveredPct}% · ${hovered.tokenAmount}`.length <= 18;

  return (
    // the donut is display-only — swallow mousedown so clicks don't focus the svg and draw a focus ring
    <div
      className="relative select-none [&_.recharts-sector]:outline-none [&_svg]:outline-none"
      onMouseDown={(event) => event.preventDefault()}
    >
      <PieChart width={200} height={200}>
        <Pie
          data={data}
          innerRadius={60}
          outerRadius={95}
          dataKey="value"
          stroke="none"
          animationDuration={400}
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
        >
          {data.map((slice) => (
            <Cell
              key={slice.id}
              fill={slice.color}
              className={cnTw(
                'transition-[fill-opacity]',
                hovered !== null && hovered.id !== slice.id ? '[fill-opacity:0.3]' : '[fill-opacity:1]',
              )}
            />
          ))}
        </Pie>
      </PieChart>

      <div className="pointer-events-none absolute inset-[46px] flex flex-col items-center justify-center rounded-full text-center">
        {hovered ? (
          <>
            <SmallTitleText>
              <Price amount={hovered.fiat} currency={currency} />
            </SmallTitleText>
            <span className="mt-0.5 text-footnote font-medium" style={{ color: hovered.color }}>
              {hovered.name}
            </span>
            {hoveredSubOneLine ? (
              <HelpText className="mt-0.5 whitespace-nowrap text-text-tertiary">
                {/* eslint-disable-next-line i18next/no-literal-string */}
                {hovered.tokenAmount ? `${hoveredPct}% · ${hovered.tokenAmount}` : `${hoveredPct}%`}
              </HelpText>
            ) : (
              <>
                <HelpText className="mt-0.5 whitespace-nowrap text-text-tertiary">
                  {/* eslint-disable-next-line i18next/no-literal-string */}
                  {`${hoveredPct}%`}
                </HelpText>
                <HelpText className="whitespace-nowrap text-text-tertiary">{hovered.tokenAmount}</HelpText>
              </>
            )}
          </>
        ) : (
          <>
            <SmallTitleText>
              <Price amount={total} currency={currency} />
            </SmallTitleText>
            <span
              className={cnTw('mt-0.5 text-footnote font-medium', !scopeColor && 'text-text-secondary')}
              style={scopeColor ? { color: scopeColor } : undefined}
            >
              {scopeLabel}
            </span>
            <HelpText className="mt-0.5 text-text-tertiary">
              {t(`dashboard.portfolioOverview.${countLabelKey}`, { count: data.length })}
            </HelpText>
          </>
        )}
      </div>
    </div>
  );
});
