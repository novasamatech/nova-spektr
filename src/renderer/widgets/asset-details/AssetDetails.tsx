import { type BN } from '@polkadot/util';
import { BigNumber } from 'bignumber.js';
import { memo } from 'react';

import { type Asset } from '@/shared/core';
import { HelpText } from '@/shared/ui';
import { AssetBalance } from '@/shared/ui-entities';
import { Skeleton } from '@/shared/ui-kit';
import { AssetFiatBalance } from '@/widgets/price';

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
      <dd>{value ? <AssetBalance value={value} asset={asset} /> : <Skeleton width="150px" height={5} />}</dd>
      <dd>
        {value ? (
          <AssetFiatBalance amount={new BigNumber(value.toString())} asset={asset} />
        ) : (
          <Skeleton width={14} height="18px" />
        )}
      </dd>
    </div>
  );
});
