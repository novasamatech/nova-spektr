import { ApiPromise } from '@polkadot/api';
import React, { useEffect, useState } from 'react';

import { Balance } from '@renderer/components/ui';
import { Asset } from '@renderer/domain/asset';
import { Threshold } from '@renderer/domain/shared-kernel';
import { useTransaction } from '@renderer/services/transaction/transactionService';

type Props = {
  api: ApiPromise;
  asset: Asset;
  threshold: Threshold;
  className?: string;
  onDepositChange?: (deposit: string) => void;
};

const Deposit = ({ api, asset, threshold, className, onDepositChange }: Props) => {
  const { getTransactionDeposit } = useTransaction();

  const [deposit, setDeposit] = useState('');

  useEffect(() => {
    const txDeposit = getTransactionDeposit(threshold, api);

    setDeposit(txDeposit);
    onDepositChange?.(txDeposit);
  }, [threshold, api]);

  return <Balance className={className} value={deposit} precision={asset.precision} symbol={asset.symbol} />;
};

export default React.memo(Deposit);
