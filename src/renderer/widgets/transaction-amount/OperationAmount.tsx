import { type BN } from '@polkadot/util';
import { memo } from 'react';

import { type Asset, type AssetByChains } from '@/shared/core';
import { cnTw } from '@/shared/lib/utils';
import { AssetBalance, AssetIcon } from '@/shared/ui-entities';
import { AsyncItem } from '@/shared/ui-kit';
import { AssetFiatBalance } from '@/widgets/price';

type Props = {
  value: BN | string;
  asset: Asset | AssetByChains;
  iconSize?: number;
  className?: string;
};

export const OperationAmount = memo(({ value, asset, iconSize = 32, className }: Props) => (
  <div className={cnTw('flex shrink-0 items-center gap-x-2', className)}>
    <AssetIcon asset={asset} size={iconSize} />
    <div className="flex flex-col items-start gap-y-0.5">
      <AssetBalance value={value} asset={asset} />
      <AsyncItem strategy="idle" fallback={<div className="h-[18px]" />}>
        <AssetFiatBalance asset={asset} amount={value} className="text-help-text text-text-tertiary" />
      </AsyncItem>
    </div>
  </div>
));
