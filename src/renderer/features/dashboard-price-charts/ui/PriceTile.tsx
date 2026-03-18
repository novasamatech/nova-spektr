import { BodyText, FootnoteText } from '@/shared/ui';
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

  return (
    <button
      type="button"
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border border-token-container-border bg-white shadow-card-shadow transition-all duration-100 hover:-translate-y-0.5 hover:shadow-[0px_4px_6px_rgba(69,69,137,0.06),0px_2px_2px_rgba(69,69,137,0.05),inset_0px_-0.5px_0px_rgba(69,69,137,0.12)]"
      onClick={onClick}
    >
      <div className="absolute inset-y-0 left-0 w-0.5" style={{ backgroundColor: accentColor }} />

      <div className="flex w-full flex-col gap-2.5 py-3 pr-3 pl-3.5">
        <div className="flex items-center gap-2">
          <AssetIcon asset={asset} size={24} />
          <FootnoteText className="font-semibold text-text-secondary">{asset.symbol}</FootnoteText>
        </div>

        {price ? (
          <div className="flex flex-col gap-1">
            <BodyText className="text-left font-semibold text-text-primary tabular-nums">
              {currencySymbol}
              {price.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
            </BodyText>
            <div className="flex">
              <PriceChange change={price.change} />
            </div>
          </div>
        ) : pending ? (
          <div className="flex flex-col gap-1">
            <Skeleton width={20} height={5} />
            <Skeleton width={12} height={4} />
          </div>
        ) : null}
      </div>
    </button>
  );
};
