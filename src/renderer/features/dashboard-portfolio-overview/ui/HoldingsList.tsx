import { useMemo } from 'react';

import { type CurrencyItem } from '@/shared/api/price-provider';
import { useI18n } from '@/shared/i18n';
import { formatBalance } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';
import { BRAND_COLORS, FALLBACK_COLORS, getColorByPriceId } from '@/shared/ui/chart-constants';
import { AssetIcon } from '@/shared/ui-entities';
import { type Holding } from '../hooks/useHoldings';

import { AllocationChart } from './AllocationChart';
import { Price } from './Price';

type Props = {
  holdings: Holding[];
  currency: CurrencyItem | null;
  onSelect?: (holding: Holding) => void;
};

export const HoldingsList = ({ holdings, currency, onSelect }: Props) => {
  const { t } = useI18n();

  const colors = useMemo(() => {
    let idx = 0;

    return holdings.map((h) =>
      BRAND_COLORS[h.priceId] ? getColorByPriceId(h.priceId, 0) : getColorByPriceId(h.priceId, idx++),
    );
  }, [holdings]);

  return (
    <div>
      <FootnoteText className="text-text-tertiary">{t('dashboard.portfolioOverview.holdings')}</FootnoteText>

      <div className="mt-3 flex items-start gap-4">
        <div className="shrink-0">
          <AllocationChart holdings={holdings} colors={colors} />
        </div>

        <div className="min-w-0 flex-1 overflow-y-auto pr-2" style={{ maxHeight: 300 }}>
          <div className="flex flex-col gap-2">
            {holdings.map((holding, index) => (
              <HoldingRow
                key={holding.priceId}
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
  holding: Holding;
  color: string;
  currency: CurrencyItem | null;
  onSelect?: (holding: Holding) => void;
};

const HoldingRow = ({ holding, color, currency, onSelect }: RowProps) => {
  const { formatted, suffix } = formatBalance(holding.totalRaw, holding.precision);

  return (
    <div
      className="flex cursor-pointer items-center gap-2 rounded py-1 transition-colors hover:bg-hover"
      onClick={() => onSelect?.(holding)}
    >
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <AssetIcon asset={holding} size={28} />

      <FootnoteText className="min-w-0 flex-1 font-semibold">{holding.symbol}</FootnoteText>

      <div className="shrink-0">
        <FootnoteText align="right" className="font-semibold tabular-nums">
          {formatted}
          {suffix} {holding.symbol}
        </FootnoteText>
        <FootnoteText align="right" className="text-text-tertiary tabular-nums">
          <Price amount={holding.fiatValue} currency={currency} />
        </FootnoteText>
      </div>
    </div>
  );
};
