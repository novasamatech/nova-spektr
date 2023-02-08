import { ApiPromise } from '@polkadot/api';

import { EraIndex } from '@renderer/domain/shared-kernel';
import { IEraService } from './common/types';

export const useEra = (): IEraService => {
  const subscribeActiveEra = (api: ApiPromise, callback: (era?: EraIndex) => void): Promise<() => void> => {
    return api.query.staking.activeEra((data: any) => {
      try {
        const unwrappedData = data.unwrap();
        callback(unwrappedData.get('index').toNumber());
      } catch (error) {
        console.warn(error);
        callback(undefined);
      }
    });
  };

  const getTimeToEra = async (api: ApiPromise, destinationEra?: EraIndex): Promise<number> => {
    if (!destinationEra) return 0;

    const eraLength = api.consts.staking.sessionsPerEra.toNumber();
    const sessionLength = api.consts.babe.epochDuration.toNumber();
    const blockCreationTime = api.consts.babe.expectedBlockTime.toNumber() / 1000;

    const activeEra = (await api.query.staking.activeEra()).unwrap().index;

    const eraStartSessionIndex = await (await api.query.staking.erasStartSessionIndex(activeEra)).unwrap().toNumber();

    const currentSessionIndex = (await api.query.session.currentIndex()).toNumber();

    const currentSlot = (await api.query.babe.currentSlot()).toNumber();
    const genesisSlot = (await api.query.babe.genesisSlot()).toNumber();

    const sessionStartSlot = currentSessionIndex * sessionLength + genesisSlot;
    const sessionProgress = currentSlot - sessionStartSlot;
    const eraProgress = (currentSessionIndex - eraStartSessionIndex) * sessionLength + sessionProgress;
    const eraRemained = eraLength * sessionLength - eraProgress;

    if (destinationEra != null) {
      const leftEras = destinationEra - activeEra.toNumber() - 1;
      const timeForLeftEras = leftEras * eraLength * sessionLength * blockCreationTime;

      return eraRemained * blockCreationTime + timeForLeftEras;
    } else {
      return eraRemained * blockCreationTime;
    }
  };

  return {
    subscribeActiveEra,
    getTimeToEra,
  };
};
