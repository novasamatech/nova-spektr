import { createStore } from 'effector';

import { type ChainId } from '@/shared/core';
import { pickNestedValue, setNestedValue } from '@/shared/lib/utils';
import { createQueryResource } from '@/shared/query';
import { type CollectivePalletsType, type CollectivesStruct } from '../_lib/types';

import { type RfcDetails } from './types';

export type RfcSummaryRequestParams = {
  prNumber: string;
  palletType: CollectivePalletsType;
  chainId: ChainId;
};

export const rfcSummaryResource = createQueryResource<RfcSummaryRequestParams>({
  key: ({ palletType, chainId }) => [palletType, chainId],
})
  .request<RfcDetails>(async ({ prNumber, chainId, palletType }) => {
    const url = new URL('/api/v1/rfc-summaries/single', 'https://opengov-backend-dev.novasama-tech.org');

    const request = fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      mode: 'cors',
      body: JSON.stringify({
        languageIsoCode: 'en',
        prNumber,
      }),
    });

    const summary = await request.then(r => r.json());

    return {
      palletType,
      chainId,
      prNumber,
      title: summary.title,
      summary: summary.summary ?? '',
    };
  })
  .cache<CollectivesStruct<Record<string, RfcDetails>>>({
    store: createStore({}),
    staleAfter: Number.POSITIVE_INFINITY,
    map(state, rfcDetail) {
      const previousState = pickNestedValue(state, rfcDetail.palletType, rfcDetail.chainId) ?? {};

      return setNestedValue(state, rfcDetail.palletType, rfcDetail.chainId, {
        ...previousState,
        [rfcDetail.prNumber]: rfcDetail,
      });
    },
  })
  .build();
