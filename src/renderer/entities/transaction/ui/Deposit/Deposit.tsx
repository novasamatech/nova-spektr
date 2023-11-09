import { ApiPromise } from '@polkadot/api';
import { useEffect, useState, memo } from 'react';

import { AssetBalance } from '@renderer/entities/asset';
import { useTransaction } from '@renderer/entities/transaction';
import type { Asset, Threshold } from '@renderer/shared/core';
import { AssetFiatBalance } from '@renderer/entities/price/ui/AssetFiatBalance';

type Props = {
  api: ApiPromise;
  asset: Asset;
  threshold: Threshold;
  className?: string;
  onDepositChange?: (deposit: string) => void;
};

export const Deposit = memo(({ api, asset, threshold, className, onDepositChange }: Props) => {
  const { getTransactionDeposit } = useTransaction();
  const [deposit, setDeposit] = useState('');

  useEffect(() => {
    const txDeposit = getTransactionDeposit(threshold, api);

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
