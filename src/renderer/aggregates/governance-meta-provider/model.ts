import { createEffect, createEvent, createStore, sample } from 'effector';

import { type GovernanceApi, polkassemblyService, subsquareService } from '@/shared/api/governance';
import { localStorageService } from '@/shared/api/local-storage';

import { type GovernanceApiSource } from './types';

const GOVERNANCE_API_KEY = 'governance_api';

const GovernanceApis: Record<GovernanceApiSource, GovernanceApi> = {
  polkassembly: polkassemblyService,
  subsquare: subsquareService,
};

const governanceStarted = createEvent();
const changeProvider = createEvent<GovernanceApiSource>();

const $metaProvider = createStore<{ type: GovernanceApiSource; service: GovernanceApi } | null>(null);

const populateFx = createEffect((): GovernanceApiSource => {
  return localStorageService.getFromStorage<GovernanceApiSource>(GOVERNANCE_API_KEY, 'subsquare');
});

const saveGovernanceApiFx = createEffect((sourceType: GovernanceApiSource) => {
  return localStorageService.saveToStorage<GovernanceApiSource>(GOVERNANCE_API_KEY, sourceType);
});

sample({
  clock: governanceStarted,
  target: populateFx,
});

sample({
  clock: changeProvider,
  target: saveGovernanceApiFx,
});

sample({
  clock: [populateFx.doneData, saveGovernanceApiFx.doneData],
  fn: sourceType => ({
    type: sourceType,
    service: GovernanceApis[sourceType],
  }),
  target: $metaProvider,
});

export const governanceMetaProvider = {
  $metaProvider,

  populate: populateFx,
  changeProvider,
};
