import { ApiPromise } from '@polkadot/api';
import { useEffect, useState, memo } from 'react';

import { Asset, AssetBalance } from '@renderer/entities/asset';
import { Threshold } from '@renderer/domain/shared-kernel';
import { useTransaction } from '@renderer/entities/transaction';

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

  return <AssetBalance className={className} value={deposit} asset={asset} />;
});
