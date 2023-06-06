import { ApiPromise } from '@polkadot/api';
import { useEffect, useState, memo } from 'react';

import { Asset } from '@renderer/domain/asset';
import { Threshold } from '@renderer/domain/shared-kernel';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { BalanceNew } from '@renderer/components/common';

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

  return <BalanceNew className={className} value={deposit} asset={asset} />;
};

export default memo(Deposit);
