import { ApiPromise } from '@polkadot/api';

import { AccountID, ChainId, EraIndex } from '@renderer/domain/shared-kernel';
import { Stake } from '@renderer/domain/stake';
import { IStakingDataService, StakingMap } from './common/types';

export const useStakingData = (): IStakingDataService => {
  const subscribeStaking = async (
    chainId: ChainId,
    api: ApiPromise,
    accounts: AccountID[],
    callback: (staking: StakingMap) => void,
  ): Promise<() => void> => {
    const controllers = await getControllers(api, accounts);

    return listenToLedger(chainId, api, controllers, accounts, callback);
  };

  const getControllers = async (api: ApiPromise, accounts: AccountID[]): Promise<AccountID[]> => {
    try {
      const controllers = await api.query.staking.bonded.multi(accounts);

      return controllers.map((controller, index) =>
        controller.isNone ? accounts[index] : controller.unwrap().toString(),
      );
    } catch (error) {
      console.warn(error);

      return [];
    }
  };

  const listenToLedger = async (
    chainId: ChainId,
    api: ApiPromise,
    controllers: AccountID[],
    accounts: AccountID[],
    callback: (data: StakingMap) => void,
  ): Promise<() => void> => {
    return api.query.staking.ledger.multi(controllers, (data) => {
      try {
        const staking = data.reduce<StakingMap>((acc, ledger, index) => {
          const accountId = accounts[index];

          if (ledger.isNone) {
            return { ...acc, [accountId]: undefined };
          }

          const { active, stash, total, unlocking } = ledger.unwrap();

          const formattedUnlocking = unlocking.toArray().map((unlock) => ({
            value: unlock.value.toString(),
            era: unlock.era.toString(),
          }));

          const payload: Stake = {
            accountId,
            chainId,
            controller: controllers[index] || stash.toHuman(),
            stash: stash.toHuman(),
            active: active.toString(),
            total: total.toString(),
            unlocking: formattedUnlocking,
          };

          return { ...acc, [accountId]: payload };
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
      const eraDuration = api.consts.babe.epochDuration.toNumber();
      const blockTime = api.consts.babe.expectedBlockTime.toNumber();

      return ((unbondingDuration * eraDuration * blockTime) / 24 / 60 / 1000 / 10).toString();
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
