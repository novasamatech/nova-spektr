import { memo, useCallback, useMemo } from 'react';

import { TEST_IDS } from '@/shared/constants';
import { useI18n } from '@/shared/i18n';
import { formatBalance } from '@/shared/lib/utils';
import { FootnoteText, HelpText, Icon } from '@/shared/ui';
import { BRAND_COLORS, getColorByPriceId } from '@/shared/ui/chart-constants';
import { AssetIcon } from '@/shared/ui-entities';
import { ScrollArea } from '@/shared/ui-kit';
import { type CurrencyItem } from '@/domains/price';
import { type Holding } from '../hooks/useHoldings';

import { type AllocationSlice, AllocationChart } from './AllocationChart';
import { Price } from './Price';

export type HoldingRowItem = Holding & { sharePercent: number };

type Props = {
  holdings: HoldingRowItem[];
  totalFiat: string;
  scopeLabel: string;
  scopeColor?: string;
  currency: CurrencyItem | null;
  onSelect?: (holding: Holding) => void;
};

export const HoldingsList = memo(({ holdings, totalFiat, scopeLabel, scopeColor, currency, onSelect }: Props) => {
  const { t } = useI18n();

  const colors = useMemo(() => {
    let idx = 0;

    return holdings.map((h) =>
      BRAND_COLORS[h.priceId] ? getColorByPriceId(h.priceId, 0) : getColorByPriceId(h.priceId, idx++),
    );
  }, [holdings]);

  const slices = useMemo<AllocationSlice[]>(
    () =>
      holdings
        .map((h, index) => {
          const { formatted, suffix } = formatBalance(h.totalRaw, h.precision);

          return {
            id: h.priceId,
            name: h.symbol,
            value: parseFloat(h.fiatValue),
            fiat: h.fiatValue,
            color: colors[index] ?? '',
            tokenAmount: `${formatted}${suffix} ${h.symbol}`,
          };
        })
        // zero-fiat holdings stay in the list but can't be a pie slice
        .filter((slice) => slice.value > 0),
    [holdings, colors],
  );

  return (
    <div className="flex items-start gap-5">
      <div className="shrink-0">
        <AllocationChart
          data={slices}
          total={totalFiat}
          scopeLabel={scopeLabel}
          scopeColor={scopeColor}
          countLabelKey="assetCount"
          currency={currency}
        />
      </div>

      <div className="min-w-0 flex-1">
        <HelpText className="text-text-tertiary">{t('dashboard.portfolioOverview.holdings')}</HelpText>
        <div className="flex max-h-[264px] flex-col">
          <ScrollArea>
            <div className="flex flex-col pr-2">
              {holdings.map((holding) => (
                <HoldingRow key={holding.priceId} holding={holding} currency={currency} onSelect={onSelect} />
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
});

type RowProps = {
  holding: HoldingRowItem;
  currency: CurrencyItem | null;
  onSelect?: (holding: Holding) => void;
};

const HoldingRow = memo(({ holding, currency, onSelect }: RowProps) => {
  const { formatted, suffix } = formatBalance(holding.totalRaw, holding.precision);
  const handleClick = useCallback(() => onSelect?.(holding), [onSelect, holding]);

  return (
    <div
      data-testid={TEST_IDS.DASHBOARD.HOLDING_ROW}
      className="flex cursor-pointer items-center gap-3 border-b border-divider py-2.5 transition-colors hover:bg-hover"
      onClick={handleClick}
    >
      <AssetIcon asset={holding} size={28} />

      <div className="min-w-0 flex-1">
        <FootnoteText className="truncate font-semibold">{holding.symbol}</FootnoteText>
        <HelpText className="text-text-tertiary tabular-nums">
          {formatted}
          {suffix} {holding.symbol}
        </HelpText>
      </div>

      <div className="shrink-0 text-right">
        <FootnoteText align="right" className="font-semibold tabular-nums">
          <Price amount={holding.fiatValue} currency={currency} />
        </FootnoteText>
        <HelpText align="right" className="text-text-tertiary tabular-nums">
          {holding.sharePercent.toFixed(1)}%
        </HelpText>
      </div>

      <Icon name="right" size={16} className="shrink-0 text-text-tertiary" />
    </div>
  );
});
