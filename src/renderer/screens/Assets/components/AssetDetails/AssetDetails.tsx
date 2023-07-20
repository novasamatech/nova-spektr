import { Asset } from '@renderer/domain/asset';
import { HelpText } from '@renderer/components/ui-redesign/Typography';
import { BalanceNew } from '@renderer/components/common';
import { Shimmering } from '@renderer/components/ui';

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
      <dd>{value ? <BalanceNew value={value} asset={asset} /> : <Shimmering width={150} height={20} />}</dd>
    </div>
  );
};
