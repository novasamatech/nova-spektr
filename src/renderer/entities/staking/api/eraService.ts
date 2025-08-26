import { type ApiPromise } from '@polkadot/api';

import { type EraIndex } from '@/shared/core';
import { assert } from '@/shared/lib/utils';

export const eraService = {
  subscribeActiveEra,
  getActiveEra,
  getTimeToEra,
};

function subscribeActiveEra(api: ApiPromise, callback: (era?: EraIndex) => void): Promise<() => void> {
  return api.query.staking.activeEra((data) => {
    try {
      const unwrappedData = data.unwrap();
      callback(unwrappedData.index.toNumber());
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

async function getTimeToEra(api: ApiPromise, timelineApi: ApiPromise, destinationEra?: EraIndex): Promise<number> {
  if (!destinationEra) return 0;

  const eraLength = api.consts.staking.sessionsPerEra.toNumber();
  const sessionDuration = timelineApi.consts.babe.epochDuration.toNumber();
  const blockTime = timelineApi.consts.babe.expectedBlockTime.toNumber() / 1000;

  const activeEra = (await api.query.staking.activeEra()).unwrap();
  const bondedEras = await api.query.staking.bondedEras();
  const activeEraStartSessionIndex = bondedEras.find(([e]) => e.eq(activeEra.index))?.[1].toNumber();

  assert(activeEraStartSessionIndex, 'activeEraStartSessionIndex not found');

  const { currentSessionIndex, currentSlot, genesisSlot } = await Promise.all([
    timelineApi.query.session.currentIndex(),
    timelineApi.query.babe.currentSlot(),
    timelineApi.query.babe.genesisSlot(),
  ]).then(([currentSessionIndex, currentSlot, genesisSlot]) => {
    return {
      currentSessionIndex: currentSessionIndex.toNumber(),
      currentSlot: currentSlot.toNumber(),
      genesisSlot: genesisSlot.toNumber(),
    };
  });

  const sessionStartSlot = currentSessionIndex * sessionDuration + genesisSlot;
  const sessionProgress = currentSlot - sessionStartSlot;
  const eraProgress = (currentSessionIndex - activeEraStartSessionIndex) * sessionDuration + sessionProgress;
  let eraRemained = eraProgress;
  if (eraProgress > 0 && eraProgress > eraLength * sessionDuration) {
    eraRemained = eraProgress % (eraLength * sessionDuration);
  }
  const leftEras = destinationEra - activeEra.index.toNumber() - 1;
  const blocksLeftForEras = leftEras * eraLength * sessionDuration;

  // After asset hub migration, active era updates are delayed (no longer tied to session end).
  // Add a 1–2 block buffer to unstaking timers to avoid edge cases,
  // but only if the staking chain differs from the timeline chain.
  // TODO buffer = 1; when polkadot fully migrates to asset hub
  const buffer = api === timelineApi ? 0 : 1;

  return (eraRemained + blocksLeftForEras + buffer) * blockTime;
}
