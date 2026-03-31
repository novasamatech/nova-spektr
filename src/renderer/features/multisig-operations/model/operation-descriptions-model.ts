import { createEffect, createStore, sample } from 'effector';

import { multisigOperation } from '@/domains/network';
import { authModel, backendConfigurationModel, fetchOperationsByIds } from '@/aggregates/backend-auth';

const $descriptions = createStore<Record<string, string>>({});

const fetchDescriptionsFx = createEffect(async ({ baseUrl, ids }: { baseUrl: string; ids: string[] }) => {
  const operations = await fetchOperationsByIds(baseUrl, ids);
  const map: Record<string, string> = {};
  for (const op of operations) {
    if (op.description) {
      map[op.id] = op.description;
    }
  }

  return map;
});

$descriptions.on(fetchDescriptionsFx.doneData, (_, map) => map);

// Refetch whenever the operations list changes (new ops appear, ops removed, etc.)
sample({
  clock: multisigOperation.$list,
  source: {
    url: backendConfigurationModel.$backendUrl,
    isAuthenticated: authModel.$isAuthenticated,
  },
  filter: ({ url, isAuthenticated }, operations) => url !== null && isAuthenticated && operations.length > 0,
  fn: ({ url }, operations) => ({ baseUrl: url!, ids: operations.map((op) => op.id) }),
  target: fetchDescriptionsFx,
});

// Clear on URL cleared or sign out
$descriptions.on(backendConfigurationModel.events.urlCleared, () => ({}));

export const operationDescriptionsModel = {
  $descriptions,
};
