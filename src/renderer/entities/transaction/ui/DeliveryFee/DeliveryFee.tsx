import { type BN } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { memo } from 'react';

import { type Asset } from '@/shared/core';
import { AssetBalance } from '@/shared/ui-entities';
import { AssetFiatBalance, priceProviderModel } from '@/entities/price';
import { FeeLoader } from '../FeeLoader/FeeLoader';

type Props = {
  fee: string | BN | null;
  loading?: boolean;
  asset: Asset;
  className?: string;
};

export const DeliveryFee = memo(({ fee, loading, asset, className }: Props) => {
  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);

  if (loading) {
    return <FeeLoader fiatFlag={Boolean(fiatFlag)} />;
  }

  if (!fee) {
    return (
      <div className="flex flex-col items-end gap-y-0.5">
        <AssetBalance value="N/A" asset={asset} className={className} />
        <AssetFiatBalance asset={asset} amount="N/A" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-y-0.5">
      <AssetBalance value={fee} asset={asset} className={className} />
      <AssetFiatBalance asset={asset} amount={fee} />
    </div>
  );
});
