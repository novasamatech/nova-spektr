import { createEvent, createStore } from 'effector';
import { persist } from 'effector-storage/local';

import { createQueryResource } from '@/shared/query';

import { operationsService } from './service';

type DescriptionsParams = {
  baseUrl: string;
  ids: string[];
};

const $cache = createStore<Record<string, string>>({});

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
        if (op.description) {
          next[op.id] = op.description;
        }
      }

      return next;
    },
  })
  .build();

const descriptionCreated = createEvent<{ id: string; description: string }>();
$cache.on(descriptionCreated, (state, { id, description }) => ({ ...state, [id]: description }));

const resetDescriptions = createEvent();
$cache.on(resetDescriptions, () => ({}));

// --- Draft-linked operations (persisted: survives refresh) ---

const $draftLinkedOperationIds = createStore<Record<string, true>>({});
persist({ key: 'draftLinkedOperationIds', store: $draftLinkedOperationIds, sync: true });

const draftLinked = createEvent<string>();
$draftLinkedOperationIds.on(draftLinked, (state, operationId) => ({ ...state, [operationId]: true as const }));

export const operationDescriptionsResource = {
  ...resource,
  descriptionCreated,
  resetDescriptions,
  $draftLinkedOperationIds,
  draftLinked,
};
