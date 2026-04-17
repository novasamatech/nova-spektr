// eslint-disable-next-line boundaries/external -- hooks will move to widgets layer in a follow-up task
import { useStoreMap } from 'effector-react';
import { useMemo } from 'react';

import { useResource } from '@/shared/query';

import { operationDescriptionsResource } from './resource';

export const useOperationDescriptionsFetch = (baseUrl: string | null, ids: string[]) => {
  const params = useMemo(() => (baseUrl && ids.length > 0 ? { baseUrl, ids } : null), [baseUrl, ids]);

  return useResource(operationDescriptionsResource, {
    params,
    defaultValue: {},
    map: cache => cache,
  });
};

export const useOperationDescription = (operationId: string): string | null => {
  return useStoreMap({
    store: operationDescriptionsResource.$cache,
    keys: [operationId],
    fn: (cache, [id]) => cache[id]?.description ?? null,
  });
};

export const useIsDraftLinkedOperation = (operationId: string): boolean => {
  return useStoreMap({
    store: operationDescriptionsResource.$cache,
    keys: [operationId],
    fn: (cache, [id]) => cache[id]?.draftId != null,
  });
};
