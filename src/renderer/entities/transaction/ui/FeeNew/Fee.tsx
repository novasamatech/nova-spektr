import { BN } from '@polkadot/util';
import { useEffect, useState, memo } from 'react';

import { Asset, AssetBalance } from '@renderer/entities/asset';
import { Shimmering } from '@renderer/shared/ui';

type Props = {
  multiply?: number;
  asset: Asset;
  className?: string;
  getFee?: () => Promise<string>;
  onFeeChange?: (fee: string) => void;
  onFeeLoading?: (loading: boolean) => void;
};

export const FeeNew = memo(({ multiply = 1, asset, getFee, className, onFeeChange, onFeeLoading }: Props) => {
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

    if (!getFee) {
      updateFee('0');
      setIsLoading(false);
    } else {
      getFee()
        .then(updateFee)
        .catch((error) => {
          updateFee('0');
          console.info('Error getting fee - ', error);
        })
        .finally(() => setIsLoading(false));
    }
  }, [getFee]);

  if (isLoading) {
    return <Shimmering width={90} height={20} data-testid="fee-loader" />;
  }

  const totalFee = new BN(fee).muln(multiply).toString();

  return <AssetBalance value={totalFee} asset={asset} className={className} />;
});
