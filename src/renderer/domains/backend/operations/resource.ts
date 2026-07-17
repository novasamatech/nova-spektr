import { createEvent, createStore } from 'effector';

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

export const operationDescriptionsResource = {
  ...resource,
  descriptionCreated,
  resetDescriptions,
};
