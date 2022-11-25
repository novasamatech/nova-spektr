import React, { useEffect, useState } from 'react';

import { ExtendedChain } from '@renderer/services/network/common/types';
import { validateAddress } from '@renderer/utils/address';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { Transaction } from '@renderer/domain/transaction';
import { Balance } from '@renderer/components/ui';

type Props = {
  connection: ExtendedChain;
  transaction?: Transaction;
  className?: string;
};

const Fee = ({ connection, transaction, className }: Props) => {
  const [transactionFee, setTransactionFee] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { getTransactionFee } = useTransaction();

  const defaultAsset = connection?.assets[0];

  const isValidTransaction = transaction?.args.value > 0 && validateAddress(transaction?.args.dest);

  useEffect(() => {
    (async () => {
      if (!transaction?.address || !connection?.api || !isValidTransaction) {
        setTransactionFee('0');
        setIsLoading(false);

        return;
      }

      setIsLoading(true);

      const fee = await getTransactionFee(transaction, connection.api);

      setTransactionFee(fee);
      setIsLoading(false);
    })();
  }, [transaction?.args, transaction?.address]);

  if (isLoading) {
    return <div className="animate-pulse bg-shade-20 rounded-lg w-20 h-2.5"></div>;
  }

  return (
    <span className={className}>
      <Balance value={transactionFee} precision={defaultAsset.precision} /> {defaultAsset.symbol}
    </span>
  );
};

export default React.memo(Fee);
