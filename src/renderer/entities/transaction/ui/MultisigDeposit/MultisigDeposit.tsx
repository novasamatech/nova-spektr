import { type ApiPromise } from '@polkadot/api';
import { useUnit } from 'effector-react';
import { memo, useEffect, useState } from 'react';

import { type Asset, type MultisigThreshold } from '@/shared/core';
import { AssetBalance } from '@/entities/asset';
import { AssetFiatBalance, priceProviderModel } from '@/entities/price';
import { transactionService } from '../../lib';
import { FeeLoader } from '../FeeLoader/FeeLoader';

type Props = {
  api: ApiPromise | null;
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

  if (isLoading) {
    return <FeeLoader fiatFlag={Boolean(fiatFlag)} />;
  }

  return (
    <div className="flex flex-col items-end gap-y-0.5">
      <AssetBalance value={deposit} asset={asset} className={className} />
      <AssetFiatBalance asset={asset} amount={deposit} />
    </div>
  );
});
