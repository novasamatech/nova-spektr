import cn from 'classnames';
import React, { useEffect, useState } from 'react';
import { ApiPromise } from '@polkadot/api';

import { Asset } from '@renderer/domain/asset';
import { validateAddress } from '@renderer/utils/address';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { Transaction } from '@renderer/domain/transaction';
import { Balance } from '@renderer/components/ui';

type Props = {
  api?: ApiPromise;
  asset: Asset;
  transaction?: Transaction;
  className?: string;
};

const Fee = ({ api, asset, transaction, className }: Props) => {
  const { getTransactionFee } = useTransaction();

  const [transactionFee, setTransactionFee] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isValidTransaction = transaction?.args.value > 0 && validateAddress(transaction?.args.dest);

  useEffect(() => {
    (async () => {
      if (!api || !transaction?.address || !isValidTransaction) {
        setTransactionFee('0');
        setIsLoading(false);

        return;
      }

      setIsLoading(true);

      const fee = await getTransactionFee(transaction, api);

      setTransactionFee(fee);
      setIsLoading(false);
    })();
  }, [transaction?.args, transaction?.address, isValidTransaction]);

  if (isLoading) {
    return <div className="animate-pulse bg-shade-20 rounded-lg w-20 h-2.5" data-testid="fee-loading" />;
  }

  return (
    <span className={cn('flex gap-x-0.5', className)}>
      <Balance value={transactionFee} precision={asset.precision} /> {asset.symbol}
    </span>
  );
};

export default React.memo(Fee);
