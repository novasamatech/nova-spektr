import { ApiPromise } from '@polkadot/api';
import { useEffect, useState, memo } from 'react';
import { useUnit } from 'effector-react';

import { AssetBalance } from '@entities/asset';
import { FeeLoader, transactionService } from '@entities/transaction';
import type { Asset, MultisigThreshold } from '@shared/core';
import { AssetFiatBalance } from '@entities/price/ui/AssetFiatBalance';
import { priceProviderModel } from '@entities/price';

type Props = {
  api?: ApiPromise;
  asset: Asset;
  threshold: MultisigThreshold;
  className?: string;
  onDepositChange?: (deposit: string) => void;
};

export const MultisigDeposit = memo(({ api, asset, threshold, className, onDepositChange }: Props) => {
  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);

  const [isLoading, setIsLoading] = useState(true);
  const [deposit, setDeposit] = useState('');

  useEffect(() => {
    setIsLoading(true);

    if (api) {
      const txDeposit = transactionService.getMultisigDeposit(threshold, api);

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
