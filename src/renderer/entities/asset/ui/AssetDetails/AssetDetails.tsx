import { type Asset } from '@shared/core';
import { HelpText, Shimmering } from '@shared/ui';
import { AssetFiatBalance } from '@entities/price';
import { AssetBalance } from '../index';

type Props = {
  asset: Asset;
  label: string;
  value?: string;
};

export const AssetDetails = ({ asset, value, label }: Props) => {
  return (
    <div className="flex flex-col flex-1 gap-y-0.5 pl-4">
      <HelpText as="dt" className="text-text-tertiary">
        {label}
      </HelpText>
      <dd>{value ? <AssetBalance value={value} asset={asset} /> : <Shimmering width={150} height={20} />}</dd>
      <dd>{value ? <AssetFiatBalance amount={value} asset={asset} /> : <Shimmering width={56} height={18} />}</dd>
    </div>
  );
};
