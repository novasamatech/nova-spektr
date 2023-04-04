import { ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import React, { useEffect, useState } from 'react';
import cn from 'classnames';

import { Balance } from '@renderer/components/ui';
import { Asset } from '@renderer/domain/asset';
import { Transaction } from '@renderer/domain/transaction';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { useToggle } from '@renderer/shared/hooks';

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

  const [isLoading, toggleLoading] = useToggle();
  const [fee, setFee] = useState('');

  const updateFee = (fee: string) => {
    setFee(fee);
    onFeeChange?.(fee);
  };

  useEffect(() => {
    toggleLoading();

    if (!transaction?.address) {
      updateFee('0');
      toggleLoading();
    } else {
      getTransactionFee(transaction, api)
        .then(updateFee)
        .catch(() => updateFee('0'))
        .finally(toggleLoading);
    }
  }, [transaction, api]);

  if (isLoading) {
    return (
      <div className={cn('animate-pulse bg-shade-20 rounded-lg w-20 h-2.5', className)} data-testid="fee-loader" />
    );
  }

  const totalFee = new BN(fee).muln(multiply).toString();

  return <Balance className={className} value={totalFee} precision={asset.precision} symbol={asset.symbol} />;
};

export default React.memo(Fee);
