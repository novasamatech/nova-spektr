import { createEffect, createStore, sample } from 'effector';

import { persist } from '@/shared/api/storage';
import { pairwise } from '@/shared/effector';
import { fetchOperationsByIds } from '@/domains/api';
import { multisigOperation } from '@/domains/network';
import { authModel, backendConfigurationModel } from '@/aggregates/backend';

const $descriptions = createStore<Record<string, string>>({});
persist({ store: $descriptions, key: 'operation-descriptions' });

// === API fetch ===

const fetchDescriptionsFx = createEffect(async ({ baseUrl, ids }: { baseUrl: string; ids: string[] }) => {
  if (ids.length === 0) return {};

  const operations = await fetchOperationsByIds(baseUrl, ids);
  const map: Record<string, string> = {};
  for (const op of operations) {
    if (op.description) {
      map[op.id] = op.description;
    }
  }

  return map;
});

$descriptions.on(fetchDescriptionsFx.doneData, (existing, fetched) => {
  if (Object.keys(fetched).length === 0) return existing;

  return { ...existing, ...fetched };
});

// === Initial fetch: when both authenticated and operations populated, fetch all missing ===

sample({
  clock: [authModel.$isAuthenticated, multisigOperation.$populated],
  source: {
    url: backendConfigurationModel.$backendUrl,
    isAuthenticated: authModel.$isAuthenticated,
    operations: multisigOperation.$list,
    descriptions: $descriptions,
  },
  filter: ({ url, isAuthenticated, operations }) => isAuthenticated && url !== null && operations.length > 0,
  fn: ({ url, operations, descriptions }) => ({
    baseUrl: url!,
    ids: operations.map(op => op.id).filter(id => !(id in descriptions)),
  }),
  target: fetchDescriptionsFx,
});

// === Delta fetch: on list updates, only fetch for new operations ===

const newOperationIds = pairwise(multisigOperation.$list).map(({ prev, current }) => {
  const prevIds = new Set(prev.map(op => op.id));

  return current.filter(op => !prevIds.has(op.id)).map(op => op.id);
});

sample({
  clock: newOperationIds,
  source: {
    url: backendConfigurationModel.$backendUrl,
    isAuthenticated: authModel.$isAuthenticated,
  },
  filter: ({ url, isAuthenticated }, ids) => url !== null && isAuthenticated && ids.length > 0,
  fn: ({ url }, ids) => ({ baseUrl: url!, ids }),
  target: fetchDescriptionsFx,
});

// === Cleanup (urlCleared → reset stores) ===

$descriptions.on(backendConfigurationModel.events.urlCleared, () => ({}));

export const operationDescriptionsModel = {
  $descriptions,
};
