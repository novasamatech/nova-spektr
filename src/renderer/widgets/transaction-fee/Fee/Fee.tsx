import { type BN } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { memo } from 'react';

import { TEST_IDS } from '@/shared/constants';
import { type Asset } from '@/shared/core';
import { AssetBalance } from '@/shared/ui-entities';
import { priceProviderModel } from '@/domains/price';
import { AssetFiatBalance } from '@/widgets/price';
import { FeeLoader } from '../FeeLoader/FeeLoader';

type Props = {
  fee: BN | string | null;
  isLoading?: boolean;
  asset: Asset;
  className?: string;
  showSymbol?: boolean;
  hideFiat?: boolean;
};

export const Fee = memo(({ fee, isLoading, asset, showSymbol, hideFiat, className }: Props) => {
  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);

  if (isLoading || !fee) {
    return <FeeLoader testId={TEST_IDS.OPERATIONS.FEE_LOADER} fiatFlag={Boolean(fiatFlag) && !hideFiat} />;
  }

  return (
    <div className="flex flex-col items-end gap-y-0.5">
      <AssetBalance value={fee} asset={asset} showSymbol={showSymbol} className={className} />
      {!hideFiat && <AssetFiatBalance asset={asset} amount={fee} />}
    </div>
  );
});
