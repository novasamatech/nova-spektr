import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type Asset, type Chain, type ChainId } from '@/shared/core';
import { getRelaychainAsset } from '@/shared/lib/utils';
import { AssetHubChains } from '@/domains/staking';
import { networkModel } from '@/entities/network';

/** A chain the asset toggle can switch to. */
export type ThresholdAsset = {
  chainId: ChainId;
  chain: Chain;
  asset: Asset;
  symbol: string;
};

/**
 * Staking lives on Asset Hub, so the toggle is built from the Asset Hub chains
 * configured in this build — never a hardcoded DOT/KSM pair.
 *
 * Unlike the rewards chart's asset hook there is no position-based default: the
 * threshold is a fact about the network, not about the wallet, so the widget
 * must not consult the selection at all.
 */
export const useThresholdAssets = (): ThresholdAsset[] => {
  const chains = useUnit(networkModel.$chains);

  return useMemo(() => {
    const options: ThresholdAsset[] = [];

    for (const chainId of Object.values(AssetHubChains)) {
      const chain = chains[chainId];
      if (!chain) continue;

      const asset = getRelaychainAsset(chain.assets);
      if (!asset) continue;

      options.push({ chainId, chain, asset, symbol: asset.symbol });
    }

    return options;
  }, [chains]);
};
