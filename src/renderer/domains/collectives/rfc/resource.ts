import { type ChainId } from '@/shared/core';
import { createRemoteResource } from '@/shared/resource';
import { type CollectivePalletsType } from '../_lib/types';

import { type RfcDetails } from './types';

type RequestParams = {
  prNumber: string;
  palletType: CollectivePalletsType;
  chainId: ChainId;
};

export const rfcSummaryResource = createRemoteResource<RequestParams, RfcDetails>({
  cache: { ttl: Number.POSITIVE_INFINITY },
  async fn({ prNumber, chainId, palletType }) {
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
  },
});
