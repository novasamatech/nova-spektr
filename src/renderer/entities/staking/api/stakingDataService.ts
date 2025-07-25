import { type ApiPromise } from '@polkadot/api';

import { type Address, type ChainId, type EraIndex, type Unlocking } from '@/shared/core';
import { ZERO_BALANCE, getExpectedBlockTime, redeemableAmount } from '@/shared/lib/utils';
import { type IStakingDataService, type StakingMap } from '../lib/types';

export const useStakingData = (): IStakingDataService => {
  const subscribeStaking = async (
    chainId: ChainId,
    api: ApiPromise,
    addresses: Address[],
    callback: (staking: StakingMap) => void,
  ): Promise<() => void> => {
    const controllers = await getControllers(api, addresses);

    return listenToLedger(chainId, api, controllers, addresses, callback);
  };

  const getControllers = async (api: ApiPromise, addresses: Address[]): Promise<Address[]> => {
    try {
      const controllers = await api.query.staking.bonded.multi(addresses);

      return controllers.map((controller, index) =>
        controller.isNone ? addresses[index] : controller.unwrap().toString(),
      );
    } catch (error) {
      console.warn(error);

      return [];
    }
  };

  const listenToLedger = async (
    chainId: ChainId,
    api: ApiPromise,
    controllers: Address[],
    addresses: Address[],
    callback: (data: StakingMap) => void,
  ): Promise<() => void> => {
    return api.query.staking.ledger.multi(controllers, (data) => {
      try {
        const staking = data.reduce<StakingMap>((acc, ledger, index) => {
          const address = addresses[index] as Address;

          if (ledger.isNone) {
            acc[address] = undefined;
          } else {
            const { active, stash, total, unlocking } = ledger.unwrap();

            const formattedUnlocking = unlocking.toArray().map((unlock) => ({
              value: unlock.value.toString(),
              era: unlock.era.toString(),
            }));

            acc[address] = {
              address,
              chainId,
              controller: controllers[index] || stash.toHuman(),
              stash: stash.toHuman(),
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
  };

  const fetchLedger = async (chainId: ChainId, api: ApiPromise, addresses: Address[]): Promise<StakingMap> => {
    const controllers = await getControllers(api, addresses);
    const data = await api.query.staking.ledger.multi(controllers);

    try {
      const staking = data.reduce<StakingMap>((acc, ledger, index) => {
        const address = addresses[index] as Address;

        if (ledger.isNone) {
          acc[address] = undefined;
        } else {
          const { active, stash, total, unlocking } = ledger.unwrap();

          const formattedUnlocking = unlocking.toArray().map((unlock) => ({
            value: unlock.value.toString(),
            era: unlock.era.toString(),
          }));

          acc[address] = {
            address,
            chainId,
            controller: controllers[index] || stash.toHuman(),
            stash: stash.toHuman(),
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
    subscribeStaking,
    getMinNominatorBond,
    getUnbondingPeriod,
    getTotalStaked,
    getNextUnstakingEra,
    hasRedeem,
    getEraDurationSeconds,
  };
};
