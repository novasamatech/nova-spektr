import { createEffect, createEvent, createStore, sample } from 'effector';

import { persist } from '@/shared/api/storage';
import { draftsService } from '@/domains/backend';
import { authModel, backendConfigurationModel } from '@/aggregates/backend';

export type Draft = {
  id: string;
  multisigAccountId: string | null;
  chainId: string;
  callData: string | null;
  decodedCallData?: unknown;
  description: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

const draftCreated = createEvent<Draft>();
const draftUpdated = createEvent<Draft>();
const draftDeleted = createEvent<string>();
const draftsLoaded = createEvent<Draft[]>();

const $drafts = createStore<Draft[]>([]);
persist({ store: $drafts, key: 'multisig-drafts' });

$drafts
  .on(draftCreated, (list, draft) => [...list, draft])
  .on(draftUpdated, (list, updated) => list.map((d) => (d.id === updated.id ? updated : d)))
  .on(draftDeleted, (list, id) => list.filter((d) => d.id !== id))
  .on(draftsLoaded, (_, drafts) => drafts);

// Sync from backend
const fetchDraftsFx = createEffect((baseUrl: string) => {
  return draftsService.fetchDrafts(baseUrl);
});

sample({
  clock: authModel.$authState,
  source: backendConfigurationModel.$backendUrl,
  filter: (url, authState): url is string => url !== null && authState !== null,
  target: fetchDraftsFx,
});

$drafts.on(fetchDraftsFx.doneData, (_, drafts) => drafts);

// Clear on disconnect
$drafts.on(backendConfigurationModel.events.urlCleared, () => []);

export const draftsModel = {
  $drafts,
  events: { draftCreated, draftUpdated, draftDeleted, draftsLoaded },
};
