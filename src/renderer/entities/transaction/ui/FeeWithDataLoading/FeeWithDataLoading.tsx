import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { memo, useEffect, useState } from 'react';

import { type Asset, type Transaction } from '@/shared/core';
import { AssetBalance } from '@/shared/ui-entities';
import { AssetFiatBalance, priceProviderModel } from '@/entities/price';
import { transactionService } from '../../lib';
import { FeeLoader } from '../FeeLoader/FeeLoader';

type Props = {
  api: ApiPromise | null;
  multiply?: number;
  asset: Asset;
  transaction?: Transaction | null;
  className?: string;
  onFeeChange?: (fee: string) => void;
  onFeeLoading?: (loading: boolean) => void;
};

/** @deprecated Use Fee with complexTxStore instead */
export const FeeWithDataLoading = memo(
  ({ api, multiply = 1, asset, transaction, className, onFeeChange, onFeeLoading }: Props) => {
    const fiatFlag = useUnit(priceProviderModel.$fiatFlag);

    const [fee, setFee] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const updateFee = (fee: string) => {
      const totalFee = new BN(fee).muln(multiply).toString();
      setFee(totalFee);
      onFeeChange?.(totalFee);
    };

    useEffect(() => {
      onFeeLoading?.(isLoading);
    }, [isLoading]);

    useEffect(() => {
      setIsLoading(true);
      if (!api || !transaction?.accountId) return;
      let mounted = true;

      api.isReady
        .then(() => transactionService.getTransactionFee(transaction, api))
        .then((fee) => {
          if (mounted) {
            updateFee(fee);
            setIsLoading(false);
          }
        })
        .catch((error) => {
          console.info('Error getting fee - ', error);
        });

      return () => {
        mounted = false;
      };
    }, [transaction, api]);

    if (isLoading) {
      return <FeeLoader fiatFlag={Boolean(fiatFlag)} />;
    }

    return (
      <div className="flex flex-col items-end gap-y-0.5">
        <AssetBalance value={fee} asset={asset} className={className} />
        <AssetFiatBalance asset={asset} amount={fee} />
      </div>
    );
  },
);
