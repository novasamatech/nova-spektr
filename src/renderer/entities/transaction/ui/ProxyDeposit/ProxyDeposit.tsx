import { ApiPromise } from '@polkadot/api';
import { useEffect, useState, memo } from 'react';
import { useUnit } from 'effector-react';

import { AssetBalance } from '@entities/asset';
import type { Asset } from '@shared/core';
import { AssetFiatBalance } from '@entities/price/ui/AssetFiatBalance';
import { proxyService } from '@shared/api/proxy';
import { priceProviderModel } from '@entities/price';
import { FeeLoader } from '../FeeLoader/FeeLoader';

type Props = {
  api?: ApiPromise;
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

    if (isLoading) return <FeeLoader fiatFlag={Boolean(fiatFlag)} />;

    return (
      <div className="flex flex-col gap-y-0.5 items-end">
        <AssetBalance value={proxyDeposit} asset={asset} className={className} />
        <AssetFiatBalance asset={asset} amount={proxyDeposit} />
      </div>
    );
  },
);
