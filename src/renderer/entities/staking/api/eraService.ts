import { type ApiPromise } from '@polkadot/api';

import { type EraIndex } from '@shared/core';

export const eraService = {
  subscribeActiveEra,
  getActiveEra,
  getTimeToEra,
};

function subscribeActiveEra(api: ApiPromise, callback: (era?: EraIndex) => void): Promise<() => void> {
  return api.query.staking.activeEra((data: any) => {
    try {
      const unwrappedData = data.unwrap();
      callback(unwrappedData.get('index').toNumber());
    } catch (error) {
      console.warn(error);
      callback(undefined);
    }
  });
}

async function getActiveEra(api: ApiPromise): Promise<EraIndex | undefined> {
  const eraData = await api.query.staking.activeEra();

  if (eraData.isNone) return undefined;

  // @ts-expect-error TODO fix
  return eraData.unwrap().get('index').toNumber();
}

async function getTimeToEra(api: ApiPromise, destinationEra?: EraIndex): Promise<number> {
  if (!destinationEra) return 0;

  const eraLength = api.consts.staking.sessionsPerEra.toNumber();
  const sessionDuration = api.consts.babe.epochDuration.toNumber();
  const blockTime = api.consts.babe.expectedBlockTime.toNumber() / 1000;

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

  const sessionStartSlot = currentSessionIndex * sessionDuration + genesisSlot;
  const sessionProgress = currentSlot - sessionStartSlot;
  const eraProgress = (currentSessionIndex - eraStartSessionIndex) * sessionDuration + sessionProgress;
  let eraRemained = eraProgress;
  if (eraProgress > 0 && eraProgress > eraLength * sessionDuration) {
    eraRemained = eraProgress % (eraLength * sessionDuration);
  }
  const leftEras = destinationEra - activeEra.toNumber() - 1;
  const blocksLeftForEras = leftEras * eraLength * sessionDuration;

  return (eraRemained + blocksLeftForEras) * blockTime;
}
