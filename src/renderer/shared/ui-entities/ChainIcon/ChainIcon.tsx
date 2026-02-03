import { memo, useState } from 'react';

import { type Chain, type ChainId } from '@/shared/core';
import { Skeleton } from '@/shared/ui-kit';

type Props = {
  chain: Chain | null | undefined;
  size?: number;
};

const loaded = new Set<ChainId>();

export const ChainIcon = memo(({ chain, size = 16 }: Props) => {
  const [isImgLoaded, toggleImgLoaded] = useState(chain ? loaded.has(chain.chainId) : false);

  if (!chain) {
    return null;
  }

  return (
    <Skeleton active={!isImgLoaded}>
      <img
        src={chain.icon}
        className="pointer-events-none h-full select-none"
        width={size}
        height={size}
        alt={`Icon for chain ${chain.name}`}
        onLoad={() => {
          toggleImgLoaded(true);
          loaded.add(chain.chainId);
        }}
      />
    </Skeleton>
  );
});
