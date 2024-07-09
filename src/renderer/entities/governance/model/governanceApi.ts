import { createStore, createEvent, sample, createEffect } from 'effector';

import { IGovernanceApi } from '@shared/api/governance';
import { localStorageService } from '@shared/api/local-storage';
import { type SourceType } from '../lib/types';
import { GOVERNANCE_API_KEY, GovernanceApis } from '../lib/constants';

const governanceStarted = createEvent();
const governanceApiChanged = createEvent<SourceType>();

const $governanceApi = createStore<{ type: SourceType; service: IGovernanceApi } | null>(null);

const getGovernanceApiFx = createEffect((): SourceType => {
  return localStorageService.getFromStorage<SourceType>(GOVERNANCE_API_KEY, 'polkassembly');
});

const saveGovernanceApiFx = createEffect((sourceType: SourceType): SourceType => {
  return localStorageService.saveToStorage<SourceType>(GOVERNANCE_API_KEY, sourceType);
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
