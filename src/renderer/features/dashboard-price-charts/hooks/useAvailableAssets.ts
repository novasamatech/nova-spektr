import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type Asset } from '@/shared/core';
import { networkModel } from '@/entities/network';

export type TrackedAssetInfo = {
  priceId: string;
  symbol: string;
  name: string;
  icon: Asset['icon'];
};

export const useAvailableAssets = (): TrackedAssetInfo[] => {
  const chains = useUnit(networkModel.$chains);

  return useMemo(() => {
    const seen = new Set<string>();
    const result: TrackedAssetInfo[] = [];

    for (const chain of Object.values(chains)) {
      for (const asset of chain.assets) {
        if (asset.priceId && !seen.has(asset.priceId)) {
          seen.add(asset.priceId);
          result.push({
            priceId: asset.priceId,
            symbol: asset.symbol,
            name: asset.name,
            icon: asset.icon,
          });
        }
      }
    }

    return result.sort((a, b) => a.symbol.localeCompare(b.symbol));
  }, [chains]);
};
