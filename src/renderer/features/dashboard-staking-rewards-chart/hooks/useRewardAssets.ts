import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type Asset, type Chain, type ChainId } from '@/shared/core';
import { getRelaychainAsset } from '@/shared/lib/utils';
import { getColorByIndex } from '@/shared/ui/chart-constants';
import { AssetHubChains } from '@/domains/staking';
import { networkModel } from '@/entities/network';
import { useStakingAccountSelection, useStakingPositions } from '@/aggregates/staking-positions';

/** A chain the asset toggle can switch to, with everything the chart needs. */
export type RewardAsset = {
  chainId: ChainId;
  chain: Chain;
  asset: Asset;
  symbol: string;
  color: string;
  /** The selected wallet stakes here — used to pick the initial asset. */
  hasPosition: boolean;
};

/**
 * Brand tints of the staking networks. Only the ones the design names; anything
 * else falls back to the shared palette, so a newly configured Asset Hub still
 * gets a colour instead of an empty bar.
 */
const CHAIN_COLORS: Record<string, string> = {
  [AssetHubChains['POLKADOT_AH']]: '#e6007a',
  [AssetHubChains['KUSAMA_AH']]: '#363643',
};

/**
 * Staking lives on Asset Hub, so the toggle is built from the Asset Hub chains
 * that are actually configured in this build — never from a hardcoded DOT/KSM
 * pair. A chain missing from the network config simply has no option.
 */
export const useRewardAssets = (accountIds: string[]): RewardAsset[] => {
  // Same rule as the KPI cards: a reader of the positions retains the
  // selection, so hiding the positions table cannot blank this widget.
  useStakingAccountSelection(accountIds);
  const chains = useUnit(networkModel.$chains);
  const { positions } = useStakingPositions();

  const stakedChainIds = useMemo(() => new Set(positions.map((position) => position.chainId)), [positions]);

  return useMemo(() => {
    const options: RewardAsset[] = [];

    for (const chainId of Object.values(AssetHubChains)) {
      const chain = chains[chainId];
      if (!chain) continue;

      const asset = getRelaychainAsset(chain.assets);
      if (!asset) continue;

      options.push({
        chainId,
        chain,
        asset,
        symbol: asset.symbol,
        color: CHAIN_COLORS[chainId] ?? getColorByIndex(options.length),
        hasPosition: stakedChainIds.has(chainId),
      });
    }

    return options;
  }, [chains, stakedChainIds]);
};
