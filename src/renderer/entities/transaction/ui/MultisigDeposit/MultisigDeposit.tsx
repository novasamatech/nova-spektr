import { ApiPromise } from '@polkadot/api';
import { useEffect, useState, memo } from 'react';
import { useUnit } from 'effector-react';

import { AssetBalance } from '@entities/asset';
import { useTransaction, FeeLoader } from '@entities/transaction';
import type { Asset, Threshold } from '@shared/core';
import { AssetFiatBalance } from '@entities/price/ui/AssetFiatBalance';
import { priceProviderModel } from '@entities/price';

type Props = {
  api?: ApiPromise;
  asset: Asset;
  threshold: Threshold;
  className?: string;
  onDepositChange?: (deposit: string) => void;
};

export const MultisigDeposit = memo(({ api, asset, threshold, className, onDepositChange }: Props) => {
  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);

  const { getMultisigDeposit } = useTransaction();

  const [isLoading, setIsLoading] = useState(true);
  const [deposit, setDeposit] = useState('');

  useEffect(() => {
    setIsLoading(true);

    if (api) {
      const txDeposit = getMultisigDeposit(threshold, api);

      setDeposit(txDeposit);
      setIsLoading(false);
      onDepositChange?.(txDeposit);
    }
  }, [threshold, api]);

  if (isLoading) return <FeeLoader fiatFlag={Boolean(fiatFlag)} />;

  return (
    <div className="flex flex-col gap-y-0.5 items-end">
      <AssetBalance value={deposit} asset={asset} className={className} />
      <AssetFiatBalance asset={asset} amount={deposit} />
    </div>
  );
});
