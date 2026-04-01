import { type ApiPromise } from '@polkadot/api';
import { useUnit } from 'effector-react';
import { memo, useEffect, useState } from 'react';

import { proxyService } from '@/shared/api/proxy';
import { type Asset } from '@/shared/core';
import { currencySelect } from '@/aggregates/currency-select';
import { Fee } from '../Fee/Fee';
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
    const fiatFlag = useUnit(currencySelect.$fiatFlag);

    const [proxyDeposit, setProxyDeposit] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      onDepositLoading?.(isLoading);
    }, [isLoading]);

    useEffect(() => {
      setIsLoading(true);

      if (api && deposit && proxyNumber) {
        const txDeposit = proxyService.getProxyDepositDelta(api, deposit, proxyNumber).toString();

        setProxyDeposit(txDeposit);
        setIsLoading(false);
        onDepositChange?.(txDeposit);
      }
    }, [api, deposit, proxyNumber]);

    if (isLoading) {
      return <FeeLoader fiatFlag={Boolean(fiatFlag)} />;
    }

    return <Fee className={className} fee={proxyDeposit} asset={asset} />;
  },
);
