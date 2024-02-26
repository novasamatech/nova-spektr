import { ApiPromise } from '@polkadot/api';
import { useEffect, useState, memo } from 'react';

import { AssetBalance } from '@entities/asset';
import { useTransaction } from '@entities/transaction';
import type { Asset } from '@shared/core';
import { AssetFiatBalance } from '@entities/price/ui/AssetFiatBalance';

type Props = {
  api: ApiPromise;
  asset: Asset;
  className?: string;
  onDepositChange?: (deposit: string) => void;
};

export const ProxyDeposit = memo(({ api, asset, className, onDepositChange }: Props) => {
  const { getProxyDeposit } = useTransaction();
  const [deposit, setDeposit] = useState('');

  useEffect(() => {
    const txDeposit = getProxyDeposit(api);

    setDeposit(txDeposit);
    onDepositChange?.(txDeposit);
  }, [api]);

  return (
    <div className="flex flex-col gap-y-0.5 items-end">
      <AssetBalance value={deposit} asset={asset} className={className} />
      <AssetFiatBalance asset={asset} amount={deposit} />
    </div>
  );
});
