import { createEvent, createStore } from 'effector';

import { createQueryResource } from '@/shared/query';

import { draftsService } from './service';
import { type Draft } from './service';

type DraftsParams = { baseUrl: string };

const $cache = createStore<Draft[]>([]);

const resource = createQueryResource<DraftsParams>({
  key: ({ baseUrl }) => [baseUrl],
})
  .name('drafts')
  .request(async ({ baseUrl }) => draftsService.fetchDrafts(baseUrl))
  .cache({
    store: $cache,
    staleAfter: 20_000,
    map: (_state, drafts) => drafts,
  })
  .build();

const draftCreated = createEvent<Draft>();
const draftUpdated = createEvent<Draft>();
const draftDeleted = createEvent<string>();
const resetDrafts = createEvent();

$cache.on(draftCreated, (list, draft) => [...list, draft]);
$cache.on(draftUpdated, (list, updated) => list.map(d => (d.id === updated.id ? updated : d)));
$cache.on(draftDeleted, (list, id) => list.filter(d => d.id !== id));
$cache.on(resetDrafts, () => []);

export const draftsResource = { ...resource, draftCreated, draftUpdated, draftDeleted, resetDrafts };
