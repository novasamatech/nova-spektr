import { type ApiPromise } from '@polkadot/api';
import { BN, BN_ZERO } from '@polkadot/util';

import { type Balance, type Chain, type ChainId, type ExternalType } from '@/shared/core';
import { toAccountId, votedAmountBN } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { AssetHubChains } from './constants';
import { type StakingMap } from './types';

function isKusamaChainId(chainId: ChainId): boolean {
  return chainId === '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe';
}

async function getControllers(api: ApiPromise, accounts: AccountId[]): Promise<AccountId[]> {
  try {
    const controllers = await api.query.staking.bonded.multi(accounts);

    return controllers.map((controller, index) =>
      controller.isNone ? accounts[index] : toAccountId(controller.unwrap().toString()),
    );
  } catch (error) {
    console.warn(error);

    return [];
  }
}

async function listenToLedger(
  chainId: ChainId,
  api: ApiPromise,
  controllers: AccountId[],
  accounts: AccountId[],
  callback: (data: StakingMap) => void,
): Promise<() => void> {
  return api.query.staking.ledger.multi(controllers, (data) => {
    try {
      const staking = data.reduce<StakingMap>((acc, ledger, index) => {
        const account = accounts[index];

        if (ledger.isNone) {
          acc[account] = undefined;
        } else {
          const { active, stash, total, unlocking } = ledger.unwrap();

          const formattedUnlocking = unlocking.toArray().map((unlock) => ({
            value: unlock.value.toString(),
            era: unlock.era.toString(),
          }));

          acc[account] = {
            accountId: account,
            chainId,
            controller: controllers[index] || toAccountId(stash.toHuman()),
            stash: toAccountId(stash.toHuman()),
            active: active.toString(),
            total: total.toString(),
            unlocking: formattedUnlocking,
          };
        }

        return acc;
      }, {});

      callback(staking);
    } catch (error) {
      console.warn(error);
      callback({});
    }
  });
}

async function subscribeStaking(
  chainId: ChainId,
  api: ApiPromise,
  accounts: AccountId[],
  callback: (staking: StakingMap) => void,
): Promise<() => void> {
  const controllers = await getControllers(api, accounts);

  return listenToLedger(chainId, api, controllers, accounts, callback);
}

function reusableLockBN(balance: Balance): BN {
  const voted = votedAmountBN(balance);
  const reusable = voted.sub(balance.reserved);

  return BN.max(BN_ZERO, reusable);
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
  subscribeStaking: subscribeStaking,
  reusableLockBN: reusableLockBN,
};
