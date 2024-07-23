import { BN } from '@polkadot/util';

import { FootnoteText, Icon } from '@shared/ui';
import { type Asset } from '@/shared/core';
import { AssetBalance } from '@/entities/asset';

type Props = {
  from: string;
  to: string;
  asset: Asset;
};

export const ValueIndicator = ({ from, to, asset }: Props) => {
  const changeValue = new BN(from).sub(new BN(to));
  const iconName = changeValue.isNeg() ? 'arrowDoubleDown' : 'arrowDoubleUp';

  return (
    <div className="flex flex-col items-end">
      <FootnoteText>
        <AssetBalance value={from} asset={asset} showSymbol={false} />
        {/* eslint-disable-next-line i18next/no-literal-string */}
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
