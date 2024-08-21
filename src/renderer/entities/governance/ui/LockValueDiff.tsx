import { BN, BN_ZERO } from '@polkadot/util';

import { type Asset } from '@/shared/core';
import { AssetBalance } from '@/entities/asset';

import { DiffValue } from './DiffValue';

type Props = {
  from: string | BN;
  to: string | BN;
  asset: Asset;
};

export const LockValueDiff = ({ from, to, asset }: Props) => {
  const fromBN = BN.isBN(from) ? from : new BN(from);
  const toBN = BN.isBN(to) ? to : new BN(to);

  const diff = fromBN.sub(toBN).isNeg() ? fromBN.sub(toBN).abs() : BN_ZERO;
  const reusableTo = diff.isZero() ? fromBN : toBN;

  return (
    <DiffValue
      from={<AssetBalance value={fromBN} asset={asset} showSymbol={false} className="text-inherit" />}
      to={<AssetBalance value={reusableTo} asset={asset} showSymbol={false} className="text-inherit" />}
      diff={<AssetBalance value={diff} asset={asset} className="text-inherit" />}
      suffix={asset.symbol}
      positive={diff.gten(0)}
    />
  );
};
