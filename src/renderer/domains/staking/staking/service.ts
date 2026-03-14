import { type ApiPromise } from '@polkadot/api';

import { type ChainId, type EraIndex } from '@/shared/core';
import { getExpectedBlockTime, toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type StakingMap } from '../_lib/types';

// =====================================================
// ================ subscribeStaking ===================
// =====================================================

async function getControllers(api: ApiPromise, accounts: AccountId[]): Promise<AccountId[]> {
  try {
    const controllers = await api.query.staking.bonded.multi(accounts);

    return controllers.map((controller, index) =>
      controller.isNone ? accounts[index]! : toAccountId(controller.unwrap().toString()),
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
  return api.query.staking.ledger.multi(controllers, data => {
    try {
      const staking = data.reduce<StakingMap>((acc, ledger, index) => {
        const account = accounts[index];
        if (!account) return acc;

        if (ledger.isNone) {
          acc[account] = undefined;
        } else {
          const { active, stash, total, unlocking } = ledger.unwrap();

          const formattedUnlocking = unlocking.toArray().map(unlock => ({
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

export async function subscribeStaking(
  chainId: ChainId,
  api: ApiPromise,
  accounts: AccountId[],
  callback: (staking: StakingMap) => void,
): Promise<() => void> {
  const controllers = await getControllers(api, accounts);

  return listenToLedger(chainId, api, controllers, accounts, callback);
}

// =====================================================
// ================ stakingService =====================
// =====================================================

export const stakingService = {
  fetchStakingLedger: async (chainId: ChainId, api: ApiPromise, accounts: AccountId[]): Promise<StakingMap> => {
    const controllers = await getControllers(api, accounts);
    const data = await api.query.staking.ledger.multi(controllers);

    try {
      const staking = data.reduce<StakingMap>((acc, ledger, index) => {
        const account = accounts[index];
        if (!account) return acc;

        if (ledger.isNone) {
          acc[account] = undefined;
        } else {
          const { active, stash, total, unlocking } = ledger.unwrap();

          const formattedUnlocking = unlocking.toArray().map(unlock => ({
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

      return staking;
    } catch (error) {
      console.warn(error);
      return {};
    }
  },

  getMinNominatorBond: async (api: ApiPromise): Promise<string> => {
    try {
      return (await api.query.staking.minNominatorBond()).toString();
    } catch (error) {
      console.warn(error);

      return '0';
    }
  },

  getUnbondingPeriod: (api: ApiPromise, timelineApi: ApiPromise): string => {
    try {
      const unbondingDuration = api.consts.staking.bondingDuration.toNumber();
      const sessionsPerEra = api.consts.staking.sessionsPerEra.toNumber();
      const sessionDuration = timelineApi.consts.babe.epochDuration.toNumber();
      const blockTime = timelineApi.consts.babe.expectedBlockTime.toNumber() / 1000;

      return (unbondingDuration * sessionsPerEra * sessionDuration * blockTime).toString();
    } catch (error) {
      console.warn(error);

      return '0';
    }
  },

  getTotalStaked: async (api: ApiPromise, era: EraIndex): Promise<string> => {
    try {
      return (await api.query.staking.erasTotalStake(era)).toString();
    } catch (error) {
      console.warn(error);

      return '0';
    }
  },

  getEraDurationSeconds: (api: ApiPromise, timelineApi: ApiPromise): number => {
    const sessionsPerEra = api.consts.staking.sessionsPerEra.toNumber();
    const sessionDuration = timelineApi.consts.babe.epochDuration.toNumber();
    const expectedBlockTime = getExpectedBlockTime(api).toNumber();

    return (sessionsPerEra * sessionDuration * expectedBlockTime) / 1000;
  },
};
