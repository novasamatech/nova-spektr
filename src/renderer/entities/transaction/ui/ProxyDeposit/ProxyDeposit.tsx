import { ApiPromise } from '@polkadot/api';
import { useEffect, useState, memo } from 'react';
import { useUnit } from 'effector-react';

import { AssetBalance } from '@entities/asset';
import type { Asset } from '@shared/core';
import { AssetFiatBalance } from '@entities/price/ui/AssetFiatBalance';
import { Shimmering } from '@shared/ui';
import { proxyService } from '@shared/api/proxy';
import { priceProviderModel } from '@entities/price';

type Props = {
  api?: ApiPromise;
  asset: Asset;
  className?: string;
  onDepositChange?: (deposit: string) => void;
};

export const ProxyDeposit = memo(({ api, asset, className, onDepositChange }: Props) => {
  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);

  const [deposit, setDeposit] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);

    if (api) {
      const txDeposit = proxyService.getProxyDeposit(api);

      setDeposit(txDeposit);
      setIsLoading(false);
      onDepositChange?.(txDeposit);
    }
  }, [api]);

  if (!api || isLoading) {
    return (
      <div className="flex flex-col gap-y-0.5 items-end">
        <Shimmering width={90} height={20} data-testid="fee-loader" />
        {fiatFlag && <Shimmering width={70} height={18} data-testid="fee-loader" />}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-y-0.5 items-end">
      <AssetBalance value={deposit} asset={asset} className={className} />
      <AssetFiatBalance asset={asset} amount={deposit} />
    </div>
  );
});
