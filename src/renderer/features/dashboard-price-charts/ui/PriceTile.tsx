import { useMemo } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';
import { getColorByPriceId } from '@/shared/ui/chart-constants';
import { AssetIcon } from '@/shared/ui-entities';
import { Skeleton } from '@/shared/ui-kit';
import { type TrackedAssetInfo } from '../hooks/useAvailableAssets';

import { PriceChange } from './PriceChange';

type Props = {
  asset: TrackedAssetInfo;
  index: number;
  price: { price: number; change: number } | null;
  currencySymbol: string;
  pending: boolean;
  onClick: () => void;
};

export const PriceTile = ({ asset, index, price, currencySymbol, pending, onClick }: Props) => {
  const accentColor = getColorByPriceId(asset.priceId, index);

  const glowStyle = useMemo(
    () => ({
      '--accent': accentColor,
      background: `linear-gradient(135deg, ${accentColor}08 0%, transparent 60%)`,
    }),
    [accentColor],
  );

  return (
    <button
      type="button"
      className={cnTw(
        'group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border bg-white shadow-card-shadow',
        'transition-shadow duration-150',
        'hover:shadow-card-shadow-level2',
        'border-token-container-border hover:border-[var(--accent)]',
      )}
      style={glowStyle}
      onClick={onClick}
    >
      <div className="absolute inset-y-0 left-0 w-[3px] rounded-l-lg" style={{ backgroundColor: accentColor }} />

      <div className="flex w-full flex-col gap-1.5 p-2.5 pl-3.5">
        <div className="flex items-center gap-1.5">
          <div className="rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <AssetIcon asset={asset} size={24} />
          </div>
          <FootnoteText className="font-semibold tracking-wide text-text-secondary">{asset.symbol}</FootnoteText>
        </div>

        {price ? (
          <div className="flex flex-col gap-0.5">
            <FootnoteText className="text-left font-semibold text-text-primary">
              {currencySymbol}
              {price.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
            </FootnoteText>
            <PriceChange change={price.change} />
          </div>
        ) : pending ? (
          <div className="flex flex-col gap-0.5">
            <Skeleton width={18} height={4} />
            <Skeleton width={10} height={3} />
          </div>
        ) : null}
      </div>
    </button>
  );
};
