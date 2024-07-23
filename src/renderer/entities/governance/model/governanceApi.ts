import { createEffect, createEvent, createStore, sample } from 'effector';

import { type GovernanceApi, polkassemblyService, subsquareService } from '@/shared/api/governance';
import { localStorageService } from '@/shared/api/local-storage';
import { type GovernanceApiSource } from '../types/governanceApiSource';

export const GOVERNANCE_API_KEY = 'governance_api';

export const GovernanceApis: Record<GovernanceApiSource, GovernanceApi> = {
  polkassembly: polkassemblyService,
  subsquare: subsquareService,
};

const governanceStarted = createEvent();
const governanceApiChanged = createEvent<GovernanceApiSource>();

const $governanceApi = createStore<{ type: GovernanceApiSource; service: GovernanceApi } | null>(null);

const getGovernanceApiFx = createEffect((): GovernanceApiSource => {
  return localStorageService.getFromStorage<GovernanceApiSource>(GOVERNANCE_API_KEY, 'polkassembly');
});

const saveGovernanceApiFx = createEffect((sourceType: GovernanceApiSource) => {
  return localStorageService.saveToStorage<GovernanceApiSource>(GOVERNANCE_API_KEY, sourceType);
});

sample({
  clock: governanceStarted,
  target: getGovernanceApiFx,
});

sample({
  clock: governanceApiChanged,
  target: saveGovernanceApiFx,
});

sample({
  clock: [getGovernanceApiFx.doneData, saveGovernanceApiFx.doneData],
  fn: (sourceType) => ({
    type: sourceType,
    service: GovernanceApis[sourceType],
  }),
  target: $governanceApi,
});

export const governanceModel = {
  $governanceApi,

  events: {
    governanceStarted,
    governanceApiChanged,
  },
};
