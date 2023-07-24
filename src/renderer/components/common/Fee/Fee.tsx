import { ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { useEffect, useState, memo } from 'react';

import { Asset } from '@renderer/domain/asset';
import { Transaction } from '@renderer/domain/transaction';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { BalanceNew } from '@renderer/components/common';
import { Shimmering } from '@renderer/shared/ui';

type Props = {
  api: ApiPromise;
  multiply?: number;
  asset: Asset;
  transaction?: Transaction;
  className?: string;
  onFeeChange?: (fee: string) => void;
  onFeeLoading?: (loading: boolean) => void;
};

const Fee = ({ api, multiply = 1, asset, transaction, className, onFeeChange, onFeeLoading }: Props) => {
  const { getTransactionFee } = useTransaction();

  const [fee, setFee] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const updateFee = (fee: string) => {
    setFee(fee);
    onFeeChange?.(fee);
  };

  useEffect(() => {
    onFeeLoading?.(isLoading);
  }, [isLoading]);

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
    return <Shimmering width={90} height={20} data-testid="fee-loader" />;
  }

  const totalFee = new BN(fee).muln(multiply).toString();

  return <BalanceNew value={totalFee} asset={asset} className={className} />;
};

export default memo(Fee);
