import { ApiPromise } from '@polkadot/api';
import { useEffect, useState, memo } from 'react';

import { AssetBalance } from '@entities/asset';
import { useTransaction } from '@entities/transaction';
import type { Asset, Threshold } from '@shared/core';
import { AssetFiatBalance } from '@entities/price/ui/AssetFiatBalance';

type Props = {
  api: ApiPromise;
  asset: Asset;
  threshold: Threshold;
  className?: string;
  onDepositChange?: (deposit: string) => void;
};

export const MultisigDeposit = memo(({ api, asset, threshold, className, onDepositChange }: Props) => {
  const { getMultisigDeposit } = useTransaction();
  const [deposit, setDeposit] = useState('');

  useEffect(() => {
    const txDeposit = getMultisigDeposit(threshold, api);

    setDeposit(txDeposit);
    onDepositChange?.(txDeposit);
  }, [threshold, api]);

  return (
    <div className="flex flex-col gap-y-0.5 items-end">
      <AssetBalance value={deposit} asset={asset} className={className} />
      <AssetFiatBalance asset={asset} amount={deposit} />
    </div>
  );
});
