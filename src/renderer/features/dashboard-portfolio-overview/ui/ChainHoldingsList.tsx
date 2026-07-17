import { memo, useCallback, useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { FootnoteText, HelpText, Icon } from '@/shared/ui';
import { getColorByIndex } from '@/shared/ui/chart-constants';
import { ScrollArea } from '@/shared/ui-kit';
import { type CurrencyItem } from '@/domains/price';
import { type ChainHolding } from '../hooks/useChainHoldings';

import { type AllocationSlice, AllocationChart } from './AllocationChart';
import { Price } from './Price';

export type ChainHoldingRowItem = ChainHolding & { sharePercent: number };

type Props = {
  chainHoldings: ChainHoldingRowItem[];
  totalFiat: string;
  scopeLabel: string;
  scopeColor?: string;
  currency: CurrencyItem | null;
  onSelect?: (chainHolding: ChainHolding) => void;
};

export const ChainHoldingsList = memo(
  ({ chainHoldings, totalFiat, scopeLabel, scopeColor, currency, onSelect }: Props) => {
    const { t } = useI18n();

    const slices = useMemo<AllocationSlice[]>(
      () =>
        chainHoldings
          .map((h, index) => ({
            id: h.chainId,
            name: h.chainName,
            value: parseFloat(h.fiatValue),
            fiat: h.fiatValue,
            color: getColorByIndex(index),
          }))
          // zero-fiat chains stay in the list but can't be a pie slice
          .filter((slice) => slice.value > 0),
      [chainHoldings],
    );

    return (
      <div className="flex items-start gap-5">
        <div className="shrink-0">
          <AllocationChart
            data={slices}
            total={totalFiat}
            scopeLabel={scopeLabel}
            scopeColor={scopeColor}
            countLabelKey="networkCount"
            currency={currency}
          />
        </div>

        <div className="min-w-0 flex-1">
          <HelpText className="text-text-tertiary">{t('dashboard.portfolioOverview.holdingsByChain')}</HelpText>
          <div className="flex max-h-[264px] flex-col">
            <ScrollArea>
              <div className="flex flex-col pr-2">
                {chainHoldings.map((holding) => (
                  <ChainHoldingRow key={holding.chainId} holding={holding} currency={currency} onSelect={onSelect} />
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    );
  },
);

type RowProps = {
  holding: ChainHoldingRowItem;
  currency: CurrencyItem | null;
  onSelect?: (holding: ChainHolding) => void;
};

const ChainHoldingRow = memo(({ holding, currency, onSelect }: RowProps) => {
  const { t } = useI18n();
  const handleClick = useCallback(() => onSelect?.(holding), [onSelect, holding]);

  return (
    <div
      className="flex cursor-pointer items-center gap-3 border-b border-divider py-2.5 transition-colors hover:bg-hover"
      onClick={handleClick}
    >
      <img src={holding.chainIcon} alt={holding.chainName} width={28} height={28} className="shrink-0" />

      <div className="min-w-0 flex-1">
        <FootnoteText className="truncate font-semibold">{holding.chainName}</FootnoteText>
        <HelpText className="text-text-tertiary">
          {t('dashboard.portfolioOverview.assetCount', { count: holding.assetCount })}
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
