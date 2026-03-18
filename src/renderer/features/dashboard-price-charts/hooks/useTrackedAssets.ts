import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { $trackedPriceIds } from '../model';

import { type TrackedAssetInfo, useAvailableAssets } from './useAvailableAssets';

export const useTrackedAssets = (): { trackedAssets: TrackedAssetInfo[]; trackedPriceIds: string[] } => {
  const trackedPriceIds = useUnit($trackedPriceIds);
  const available = useAvailableAssets();

  const trackedAssets = useMemo(() => {
    const availableMap = new Map(available.map((a) => [a.priceId, a]));

    return trackedPriceIds.reduce<TrackedAssetInfo[]>((acc, id) => {
      const asset = availableMap.get(id);
      if (asset) acc.push(asset);

      return acc;
    }, []);
  }, [trackedPriceIds, available]);

  return { trackedAssets, trackedPriceIds };
};
