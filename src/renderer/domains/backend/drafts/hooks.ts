import { useMemo } from 'react';

import { useResource } from '@/shared/query';

import { draftsResource } from './resource';

export const useDrafts = (baseUrl: string | null) => {
  const params = useMemo(() => (baseUrl ? { baseUrl } : null), [baseUrl]);

  return useResource(draftsResource, {
    params,
    defaultValue: [],
    map: cache => cache,
  });
};
