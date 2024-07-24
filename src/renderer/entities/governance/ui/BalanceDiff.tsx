import { BN } from '@polkadot/util';
import { memo } from 'react';

import { type Asset } from '@shared/core';
import { AssetBalance } from '@/entities/asset';

import { DiffValue } from './DiffValue';

type Props = {
  asset: Asset;
  from: string;
  to: string;
};

export const BalanceDiff = memo(({ from, to, asset }: Props) => {
  const fromBN = new BN(from);
  const toBN = new BN(to);
  const diff = toBN.sub(fromBN);

  return (
    <DiffValue
      from={<AssetBalance value={fromBN} asset={asset} showSymbol={false} className="text-inherit" />}
      to={<AssetBalance value={toBN} asset={asset} showSymbol={false} className="text-inherit" />}
      diff={<AssetBalance value={diff.abs()} asset={asset} className="text-inherit" />}
      suffix={asset.symbol}
      positive={diff.gten(0)}
    />
  );
});
