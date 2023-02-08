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

    const { eraStartSessionIndex, currentSessionIndex, currentSlot, genesisSlot } = await Promise.all([
      api.query.staking.erasStartSessionIndex(activeEra),
      api.query.session.currentIndex(),
      api.query.babe.currentSlot(),
      api.query.babe.genesisSlot(),
    ]).then(([eraStartSessionIndex, currentSessionIndex, currentSlot, genesisSlot]) => {
      return {
        eraStartSessionIndex: eraStartSessionIndex.unwrap().toNumber(),
        currentSessionIndex: currentSessionIndex.toNumber(),
        currentSlot: currentSlot.toNumber(),
        genesisSlot: genesisSlot.toNumber(),
      };
    });

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
