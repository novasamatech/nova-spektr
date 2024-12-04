import { memo } from 'react';

import { type AssetByChains, type Chain } from '@/shared/core';
import { HelpText } from '@/shared/ui';
import { ChainIcon } from '@/entities/chain';

const MAX_VISIBLE_CHAINS = 3;

type Props = {
  assetChains: AssetByChains['chains'];
  chains: Record<`0x${string}`, Chain>;
};

export const ChainsList = memo(({ assetChains, chains }: Props) => {
  const visibleChains = assetChains.length === MAX_VISIBLE_CHAINS ? MAX_VISIBLE_CHAINS : MAX_VISIBLE_CHAINS - 1;

  return (
    <div className="flex items-center gap-x-0.5">
      {assetChains.slice(0, visibleChains).map(({ chainId, name, assetSymbol }) => (
        <ChainIcon key={`${chainId}-${assetSymbol}`} src={chains[chainId].icon} name={name} size={18} />
      ))}
      {assetChains.length > MAX_VISIBLE_CHAINS && (
        <div className="b-r-2 flex w-6 items-center justify-center rounded bg-token-background p-0.5">
          <HelpText className="text-white">+{assetChains.length - 3}</HelpText>
        </div>
      )}
    </div>
  );
});
