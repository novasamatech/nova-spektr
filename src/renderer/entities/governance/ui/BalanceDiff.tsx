import { BN, BN_ZERO } from '@polkadot/util';
import { memo } from 'react';

import { type Asset } from '@/shared/core';
import { AssetBalance } from '@/entities/asset';

import { DiffValue } from './DiffValue';

type Props = {
  asset: Asset;
  from: string | BN;
  to: string | BN;
  lock?: BN;
};

/**
 * Calculates the balance difference between the current balance (`from`) and
 * the target balance (`to`), factoring in a locked amount. If the target
 * balance (`to`) is less than the current balance (`from`), the locked balance
 * is added to `to`, but the resulting `realTo` balance will not exceed the
 * original `from` balance. If `to` is greater than or equal to `from`, the
 * difference is simply `to - from`
 */
export const BalanceDiff = memo(({ from, to, asset, lock = BN_ZERO }: Props) => {
  const fromBN = BN.isBN(from) ? from : new BN(from);
  const toBN = BN.isBN(to) ? to : new BN(to);

  const realTo = toBN.gte(fromBN) ? toBN : BN.min(toBN.add(lock), fromBN);
  const diff = realTo.sub(fromBN);

  return (
    <DiffValue
      from={<AssetBalance value={fromBN} asset={asset} showSymbol={false} className="text-inherit" />}
      to={<AssetBalance value={realTo} asset={asset} showSymbol={false} className="text-inherit" />}
      diff={<AssetBalance value={diff.abs()} asset={asset} className="text-inherit" />}
      suffix={asset.symbol}
      positive={diff.gten(0)}
    />
  );
});
