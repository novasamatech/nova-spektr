import { ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { useEffect, useState, memo } from 'react';
import { useUnit } from 'effector-react';

import { Asset, AssetBalance } from '@renderer/entities/asset';
import { Transaction, useTransaction } from '@renderer/entities/transaction';
import { Shimmering } from '@renderer/shared/ui';
import { priceProviderModel } from '@renderer/entities/price';
import { AssetFiatBalance } from '@renderer/entities/price/ui/AssetFiatBalance';

type Props = {
  api: ApiPromise;
  multiply?: number;
  asset: Asset;
  transaction?: Transaction;
  className?: string;
  onFeeChange?: (fee: string) => void;
  onFeeLoading?: (loading: boolean) => void;
};

export const Fee = memo(({ api, multiply = 1, asset, transaction, className, onFeeChange, onFeeLoading }: Props) => {
  const { getTransactionFee } = useTransaction();
  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);

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
    return (
      <div className="flex flex-col gap-y-0.5 items-end">
        <Shimmering width={90} height={20} data-testid="fee-loader" />
        {fiatFlag && <Shimmering width={70} height={18} data-testid="fee-loader" />}
      </div>
    );
  }

  const totalFee = new BN(fee).muln(multiply).toString();

  return (
    <div className="flex flex-col gap-y-0.5 items-end">
      <AssetBalance value={totalFee} asset={asset} className={className} />
      <AssetFiatBalance asset={asset} amount={totalFee} />
    </div>
  );
});
