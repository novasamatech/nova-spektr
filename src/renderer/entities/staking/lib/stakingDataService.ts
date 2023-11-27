import { ApiPromise } from '@polkadot/api';

import { IStakingDataService, StakingMap } from './common/types';
import type { Address, ChainId, EraIndex } from '@shared/core';

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

  const getMinNominatorBond = async (api: ApiPromise): Promise<string> => {
    try {
      return (await api.query.staking.minNominatorBond()).toString();
    } catch (error) {
      console.warn(error);

      return '0';
    }
  };

  const getUnbondingPeriod = (api: ApiPromise): string => {
    try {
      const unbondingDuration = api.consts.staking.bondingDuration.toNumber();
      const sessionsPerEra = api.consts.staking.sessionsPerEra.toNumber();
      const sessionDuration = api.consts.babe.epochDuration.toNumber();
      const blockTime = api.consts.babe.expectedBlockTime.toNumber() / 1000;

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

  return {
    subscribeStaking,
    getMinNominatorBond,
    getUnbondingPeriod,
    getTotalStaked,
  };
};
