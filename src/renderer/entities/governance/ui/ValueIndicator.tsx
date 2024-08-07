/* eslint-disable i18next/no-literal-string */
import { BN } from '@polkadot/util';

import { type Asset } from '@/shared/core';
import { FootnoteText, Icon } from '@shared/ui';
import { AssetBalance } from '@/entities/asset';

type Props = {
  from: string;
  to: string;
  asset: Asset;
};

export const ValueIndicator = ({ from, to, asset }: Props) => {
  const changeValue = new BN(from).sub(new BN(to));
  const iconName = changeValue.isNeg() ? 'arrowDoubleUp' : 'arrowDoubleDown';

  return (
    <div className="flex flex-col items-end">
      <FootnoteText>
        <AssetBalance value={from} asset={asset} showSymbol={false} />
        &rarr; <AssetBalance value={to} asset={asset} showSymbol={false} />
        {asset.symbol}
      </FootnoteText>
      <FootnoteText className="text-tab-text-accent flex items-center">
        <Icon name={iconName} size={16} className="text-inherit" />
        <AssetBalance value={changeValue.abs().toString()} asset={asset} className="text-tab-text-accent" />
      </FootnoteText>
    </div>
  );
};
