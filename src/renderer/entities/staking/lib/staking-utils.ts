import { type Chain, type ChainId, type ExternalType } from '@/shared/core';

import { AssetHubChains } from './constants';

function isKusamaChainId(chainId: ChainId): boolean {
  return chainId === '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe';
}

type RewardSource = {
  url: string;
  addressPrefix: number;
};

const ASSET_HUB_CHAIN_IDS = new Set(Object.values(AssetHubChains));

const collectRewardSources = (sourceChain: Chain | undefined, type: ExternalType, map: Map<string, RewardSource>) => {
  if (!sourceChain) return;
  const external = sourceChain.externalApi?.[type];
  if (!external) return;

  for (const item of external) {
    if (item.type !== 'subquery' || map.has(item.url)) continue;

    map.set(item.url, {
      url: item.url,
      addressPrefix: sourceChain.addressPrefix,
    });
  }
};

const isAssetHubChain = (chain?: Chain | null): boolean => {
  if (!chain) return false;
  return ASSET_HUB_CHAIN_IDS.has(chain.chainId);
};

export const stakingUtils = {
  isKusamaChainId,
  collectRewardSources,
  isAssetHubChain,
};
