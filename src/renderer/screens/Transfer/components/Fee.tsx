import { useEffect, useState } from 'react';

import { ExtendedChain } from '@renderer/services/network/common/types';
import { formatAddress } from '@renderer/utils/address';
import { Wallet } from '@renderer/domain/wallet';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { Transaction } from '@renderer/domain/transaction';
import { Balance } from '@renderer/components/ui';

type Props = {
  wallet: Wallet;
  connection: ExtendedChain;
  transaction: Transaction;
  className?: string;
};

const Fee = ({ wallet, connection, transaction, className }: Props) => {
  const [transactionFee, setTransactionFee] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { getTransactionFee } = useTransaction();

  const defaultAsset = connection?.assets[0];
  const currentAddress = formatAddress(
    wallet.mainAccounts[0].accountId || wallet?.chainAccounts[0].accountId || '',
    connection?.addressPrefix,
  );

  useEffect(() => {
    (async () => {
      if (!currentAddress || !connection?.api) {
        setTransactionFee('');

        return;
      }

      setIsLoading(true);

      const fee = await getTransactionFee(transaction, connection.api);

      setTransactionFee(fee);
      setIsLoading(false);
    })();
  }, [currentAddress, connection?.api]);

  if (isLoading) {
    return <div className="animate-pulse w-20 h-5"></div>;
  }

  return (
    <span className={className}>
      <Balance value={transactionFee} precision={defaultAsset.precision} /> {defaultAsset.symbol}
    </span>
  );
};

export default Fee;
