import { type BN } from '@polkadot/util';
import { BigNumber } from 'bignumber.js';
import { memo } from 'react';

import { type Asset } from '@/shared/core';
import { HelpText, Shimmering } from '@/shared/ui';
import { AssetFiatBalance } from '@/entities/price';
import { AssetBalance } from '../AssetBalance/AssetBalance';

type Props = {
  asset: Asset;
  label: string;
  value?: BN;
};

export const AssetDetails = memo(({ asset, value, label }: Props) => {
  return (
    <div className="flex flex-1 flex-col gap-y-0.5 pl-4">
      <HelpText as="dt" className="text-text-tertiary">
        {label}
      </HelpText>
      <dd>{value ? <AssetBalance value={value} asset={asset} /> : <Shimmering width={150} height={20} />}</dd>
      <dd>
        {value ? (
          <AssetFiatBalance amount={new BigNumber(value.toString())} asset={asset} />
        ) : (
          <Shimmering width={56} height={18} />
        )}
      </dd>
    </div>
  );
});
