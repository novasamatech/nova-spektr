import { createEffect, createEvent, createStore } from 'effector';

import { createQueryResource } from '@/shared/query';

import { operationsService } from './service';

type DescriptionsParams = {
  baseUrl: string;
  ids: string[];
};

type CachedOperation = {
  description: string | null;
  draftId: string | null;
};

const $cache = createStore<Record<string, CachedOperation>>({});

const resource = createQueryResource<DescriptionsParams>({
  key: ({ baseUrl, ids }) => [baseUrl, ids.toSorted().join(',')],
})
  .name('operation-descriptions')
  .request(async ({ baseUrl, ids }, _signal) => operationsService.fetchDescriptionsByIds(baseUrl, ids))
  .cache({
    store: $cache,
    staleAfter: 5 * 60 * 1000,
    map: (state, results, _params) => {
      const next = { ...state };
      for (const op of results) {
        next[op.id] = {
          description: op.description,
          draftId: op.draftId ?? null,
        };
      }

      return next;
    },
  })
  .build();

const descriptionCreated = createEvent<{ id: string; description: string; draftId?: string }>();
$cache.on(descriptionCreated, (state, { id, description, draftId }) => ({
  ...state,
  [id]: { description, draftId: draftId ?? state[id]?.draftId ?? null },
}));

const resetDescriptions = createEvent();
$cache.on(resetDescriptions, () => ({}));

// Derived: set of draftIds that have a linked operation (from backend data)
const $linkedDraftIds = $cache.map(cache => {
  const set = new Set<string>();
  for (const op of Object.values(cache)) {
    if (op.draftId) {
      set.add(op.draftId);
    }
  }

  return set;
});

const fetchAllFx = createEffect(async (baseUrl: string) => {
  return operationsService.fetchAllDescriptions(baseUrl);
});

$cache.on(fetchAllFx.doneData, (state, results) => {
  const next = { ...state };
  for (const op of results) {
    next[op.id] = { description: op.description, draftId: op.draftId ?? null };
  }

  return next;
});

// True after the first fetchAllFx completes (drafts should wait for this before rendering)
const $operationsLoaded = createStore(false)
  .on(fetchAllFx.done, () => true)
  .on(resetDescriptions, () => false);

export const operationDescriptionsResource = {
  ...resource,
  descriptionCreated,
  resetDescriptions,
  $linkedDraftIds,
  $operationsLoaded,
  fetchAllFx,
};
