import { createStore } from 'effector';

import { type ChainId } from '@/shared/core';
import { setNestedValue } from '@/shared/lib/utils';
import { createQueryResource } from '@/shared/query';
import { type CollectivePalletsType, type CollectivesStruct } from '../_lib/types';

import { CODEX_URL } from './constants';

export type CodexRequestParams = {
  palletType: CollectivePalletsType;
  chainId: ChainId;
};

export const codexResource = createQueryResource<CodexRequestParams>({
  key: ({ palletType, chainId }) => [palletType, chainId],
})
  .request<string>(async () => {
    const response = await fetch(CODEX_URL);

    if (!response.ok) {
      throw new Error(`Failed to fetch codex: ${response.status} ${response.statusText}`);
    }

    return response.text();
  })
  .retry({
    count: 5,
    delay: 5000,
  })
  .cache<CollectivesStruct<string>>({
    staleAfter: Number.POSITIVE_INFINITY,
    store: createStore({}),
    map(state, codex, { palletType, chainId }) {
      return setNestedValue(state, palletType, chainId, codex);
    },
  })
  .build();
