import { AssetBalance } from '../index';
import { Shimmering, HelpText } from '@renderer/shared/ui';
import type { Asset } from '@renderer/shared/core';

type Props = {
  asset: Asset;
  value?: string;
  label: string;
  showShimmer?: boolean;
};

export const AssetDetails = ({ asset, value, label }: Props) => {
  return (
    <div className="flex flex-col flex-1 gap-y-0.5 pl-4">
      <HelpText as="dt" className="text-text-tertiary">
        {label}
      </HelpText>
      <dd>{value ? <AssetBalance value={value} asset={asset} /> : <Shimmering width={150} height={20} />}</dd>
    </div>
  );
};
