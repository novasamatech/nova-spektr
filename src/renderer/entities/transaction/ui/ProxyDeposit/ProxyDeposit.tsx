import { type ApiPromise } from '@polkadot/api';
import { useUnit } from 'effector-react';
import { memo, useEffect, useState } from 'react';

import { proxyService } from '@/shared/api/proxy';
import { type Asset } from '@/shared/core';
import { AssetBalance } from '@/entities/asset';
import { AssetFiatBalance, priceProviderModel } from '@/entities/price';
import { FeeLoader } from '../FeeLoader/FeeLoader';

type Props = {
  api: ApiPromise | null;
  asset: Asset;
  deposit?: string;
  proxyNumber?: number;
  className?: string;
  onDepositChange?: (deposit: string) => void;
  onDepositLoading?: (loading: boolean) => void;
};

export const ProxyDeposit = memo(
  ({ api, asset, deposit, proxyNumber, className, onDepositChange, onDepositLoading }: Props) => {
    const fiatFlag = useUnit(priceProviderModel.$fiatFlag);

    const [proxyDeposit, setProxyDeposit] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      onDepositLoading?.(isLoading);
    }, [isLoading]);

    useEffect(() => {
      setIsLoading(true);

      if (api && deposit && proxyNumber) {
        const txDeposit = proxyService.getProxyDeposit(api, deposit, proxyNumber);

        setProxyDeposit(txDeposit);
        setIsLoading(false);
        onDepositChange?.(txDeposit);
      }
    }, [api, deposit, proxyNumber]);

    if (isLoading) {
      return <FeeLoader fiatFlag={Boolean(fiatFlag)} />;
    }

    return (
      <div className="flex flex-col items-end gap-y-0.5">
        <AssetBalance value={proxyDeposit} asset={asset} className={className} />
        <AssetFiatBalance asset={asset} amount={proxyDeposit} />
      </div>
    );
  },
);
