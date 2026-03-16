import { BN, BN_ZERO } from '@polkadot/util';

import {
  type Balance,
  type Chain,
  type ChainId,
  type EraIndex,
  type ExternalType,
  type Unlocking,
} from '@/shared/core';
import { ZERO_BALANCE, redeemableAmount, votedAmountBN } from '@/shared/lib/utils';

import { AssetHubChains } from './constants';
import { type RewardSource } from './types';

function isKusamaChainId(chainId: ChainId): boolean {
  return chainId === '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe';
}

function reusableLockBN(balance: Balance): BN {
  const voted = votedAmountBN(balance);
  const reusable = voted.sub(balance.reserved);

  return BN.max(BN_ZERO, reusable);
}

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

function getNextUnstakingEra(unlocking: Unlocking[] = [], era?: number): EraIndex | undefined {
  if (!era) return undefined;
  const unlockingMatch = unlocking.find(u => Number(u.era) > era);

  return unlockingMatch ? Number(unlockingMatch.era) : undefined;
}

function hasRedeem(unlocking: Unlocking[] = [], era?: number): boolean {
  if (!era || unlocking.length === 0) return false;

  return redeemableAmount(unlocking, era) !== ZERO_BALANCE;
}

export const stakingCommonService = {
  isKusamaChainId,
  collectRewardSources,
  isAssetHubChain,
  reusableLockBN,
  getNextUnstakingEra,
  hasRedeem,
};
