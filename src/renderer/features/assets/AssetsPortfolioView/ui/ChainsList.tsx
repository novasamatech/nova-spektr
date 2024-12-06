import { type ReactNode, memo } from 'react';

import { type AssetByChains, type Chain } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { HelpText } from '@/shared/ui';
import { ChainIcon } from '@/entities/chain';

const MAX_VISIBLE_CHAINS = 3;
const MAX_VISIBLE_CHAINS_WHEN_COLLAPSED = 2;

type Props = {
  assetChains: AssetByChains['chains'];
  chains: Record<`0x${string}`, Chain>;
};

export const ChainsList = memo(({ assetChains, chains }: Props) => {
  const shouldRenderCounter = assetChains.length > MAX_VISIBLE_CHAINS;
  const visibleChains = shouldRenderCounter ? MAX_VISIBLE_CHAINS_WHEN_COLLAPSED : assetChains.length;
  const counter = assetChains.length - MAX_VISIBLE_CHAINS_WHEN_COLLAPSED;

  // Since this component renders inside large loop it's better to optimize it as hard as we can.
  // This optimization can be omited after refactoring of AssetByChains struct.
  const chainNodes: ReactNode[] = new Array(visibleChains);

  for (let index = 0; index < visibleChains; index++) {
    const chain = assetChains[index];
    if (nullable(chain)) continue;
    chainNodes[index] = (
      <ChainIcon
        key={`${chain.chainId}-${chain.assetSymbol}`}
        src={chains[chain.chainId].icon}
        name={chain.name}
        size={18}
      />
    );
  }

  return (
    <div className="flex items-center gap-0.5">
      {chainNodes}
      {shouldRenderCounter && (
        <div className="b-r-2 flex w-6 items-center justify-center rounded bg-token-background p-0.5">
          <HelpText className="text-white">+{counter}</HelpText>
        </div>
      )}
    </div>
  );
});
