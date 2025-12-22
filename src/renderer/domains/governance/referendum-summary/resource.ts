import { createStore } from 'effector';

import { type ChainId, type ReferendumId } from '@/shared/core';
import { dictionary } from '@/shared/lib/utils';
import { createQueryResource } from '@/shared/query';

export type ReferendumSummaryRequestParams = {
  chainId: ChainId;
  referendumIds: ReferendumId[];
};

type ApiResponse = {
  referendumId: string;
  title: string;
  summary: string;
}[];

export type ReferendumSummary = {
  chainId: ChainId;
  referendumId: ReferendumId;
  summary: string;
};

type CacheState = Record<ChainId, Record<ReferendumId, ReferendumSummary>>;

export const referendumSummaryResource = createQueryResource<ReferendumSummaryRequestParams>({
  key: ({ chainId, referendumIds }) => [chainId, referendumIds],
})
  .request<ReferendumSummary[]>(async ({ chainId, referendumIds }) => {
    const url = new URL('/api/v1/referendum-summaries/list', 'https://opengov-backend-dev.novasama-tech.org');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      mode: 'cors',
      body: JSON.stringify({
        chainId: chainId.replace('0x', ''),
        languageIsoCode: 'en',
        referendumIds,
      }),
    });

    const data: ApiResponse = await response.json();

    return data.map(item => ({
      chainId,
      referendumId: item.referendumId satisfies ReferendumId,
      summary: item.summary ?? '',
    }));
  })
  .cache<CacheState>({
    store: createStore({}),
    staleAfter: Number.POSITIVE_INFINITY,
    map(state, summaries, { chainId }) {
      const previousState = state[chainId] ?? {};
      const newSummaries = dictionary(summaries, 'referendumId');

      return {
        ...state,
        [chainId]: {
          ...previousState,
          ...newSummaries,
        },
      };
    },
  })
  .build();
