import { type ApiPromise } from '@polkadot/api';

import { type ChainId, type EraIndex, type Unlocking } from '@/shared/core';
import { ZERO_BALANCE, getExpectedBlockTime, redeemableAmount, toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type IStakingDataService, type StakingMap } from '../lib/types';

export const useStakingData = (): IStakingDataService => {
  const getControllers = async (api: ApiPromise, accounts: AccountId[]) => {
    try {
      const controllers = await api.query.staking.bonded.multi(accounts);

      return controllers.map((controller, index) =>
        controller.isNone ? accounts[index] : toAccountId(controller.unwrap().toString()),
      );
    } catch (error) {
      console.warn(error);

      return [];
    }
  };

  const fetchLedger = async (chainId: ChainId, api: ApiPromise, accounts: AccountId[]): Promise<StakingMap> => {
    const controllers = await getControllers(api, accounts);
    const data = await api.query.staking.ledger.multi(controllers);

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

      return staking;
    } catch (error) {
      console.warn(error);
      return {};
    }
  };

  const getMinNominatorBond = async (api: ApiPromise): Promise<string> => {
    try {
      return (await api.query.staking.minNominatorBond()).toString();
    } catch (error) {
      console.warn(error);

      return '0';
    }
  };

  const getUnbondingPeriod = (api: ApiPromise, timelineApi: ApiPromise): string => {
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
  };

  const getTotalStaked = async (api: ApiPromise, era: EraIndex): Promise<string> => {
    try {
      return (await api.query.staking.erasTotalStake(era)).toString();
    } catch (error) {
      console.warn(error);

      return '0';
    }
  };

  const getNextUnstakingEra = (unlocking: Unlocking[] = [], era?: number): EraIndex | undefined => {
    if (!era) return undefined;
    const unlockingMatch = unlocking.find((u) => Number(u.era) > era);

    return unlockingMatch ? Number(unlockingMatch.era) : undefined;
  };

  const hasRedeem = (unlocking: Unlocking[] = [], era?: number): boolean => {
    if (!era || unlocking.length === 0) return false;

    return redeemableAmount(unlocking, era) !== ZERO_BALANCE;
  };

  const getEraDurationSeconds = (api: ApiPromise, timelineApi: ApiPromise): number => {
    const sessionsPerEra = api.consts.staking.sessionsPerEra.toNumber();
    const sessionDuration = timelineApi.consts.babe.epochDuration.toNumber();
    const expectedBlockTime = getExpectedBlockTime(api).toNumber();

    return (sessionsPerEra * sessionDuration * expectedBlockTime) / 1000;
  };

  return {
    fetchLedger,
    getMinNominatorBond,
    getUnbondingPeriod,
    getTotalStaked,
    getNextUnstakingEra,
    hasRedeem,
    getEraDurationSeconds,
  };
};
