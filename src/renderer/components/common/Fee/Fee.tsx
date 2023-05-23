import { ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import React, { useEffect, useState } from 'react';

import cnTw from '@renderer/shared/utils/twMerge';
import { Asset } from '@renderer/domain/asset';
import { Transaction } from '@renderer/domain/transaction';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { BalanceNew } from '@renderer/components/common';

type Props = {
  api: ApiPromise;
  multiply?: number;
  asset: Asset;
  transaction?: Transaction;
  className?: string;
  onFeeChange?: (fee: string) => void;
};

const Fee = ({ api, multiply = 1, asset, transaction, className, onFeeChange }: Props) => {
  const { getTransactionFee } = useTransaction();

  const [fee, setFee] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const updateFee = (fee: string) => {
    setFee(fee);
    onFeeChange?.(fee);
  };

  useEffect(() => {
    setIsLoading(true);

    if (!transaction?.address) {
      updateFee('0');
      setIsLoading(false);
    } else {
      getTransactionFee(transaction, api)
        .then(updateFee)
        .catch((error) => {
          updateFee('0');
          console.info('Error getting fee - ', error);
        })
        .finally(() => setIsLoading(false));
    }
  }, [transaction, api]);

  if (isLoading) {
    return (
      <div className={cnTw('animate-pulse bg-shade-20 rounded-lg w-20 h-2.5', className)} data-testid="fee-loader" />
    );
  }

  const totalFee = new BN(fee).muln(multiply).toString();

  return <BalanceNew value={totalFee} asset={asset} className={className} />;
};

export default React.memo(Fee);
