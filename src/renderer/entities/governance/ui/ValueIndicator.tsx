/* eslint-disable i18next/no-literal-string */
import { BN } from '@polkadot/util';

import { type Asset } from '@/shared/core';
import { AssetBalance } from '@/entities/asset';

import { DiffValue } from './DiffValue';

type Props = {
  from: string;
  to: string;
  asset: Asset;
};

export const ValueIndicator = ({ from, to, asset }: Props) => {
  const changeValue = new BN(from).sub(new BN(to));

  return (
    <DiffValue
      from={<AssetBalance value={from} asset={asset} showSymbol={false} className="text-inherit" />}
      to={<AssetBalance value={to} asset={asset} showSymbol={false} className="text-inherit" />}
      diff={<AssetBalance value={changeValue.abs().toString()} asset={asset} className="text-inherit" />}
      suffix={asset.symbol}
      positive={to <= from}
    />
  );
};
