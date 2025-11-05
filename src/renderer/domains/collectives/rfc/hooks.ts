import { type NullableMap } from '@/shared/core';
import { nonNullableMap } from '@/shared/lib/utils';
import { useResource } from '@/shared/query';

import { type RfcSummaryRequestParams, rfcSummaryResource } from './resource';

export const useRfcSummary = (params: NullableMap<RfcSummaryRequestParams>) => {
  return useResource(rfcSummaryResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: null,
    map(cache, { palletType, chainId, prNumber }) {
      const rfcList = cache[palletType]?.[chainId];
      if (rfcList) {
        return rfcList[prNumber] ?? null;
      }
    },
  });
};
