import { type NullableMap } from '@/shared/core';
import { nonNullableMap } from '@/shared/lib/utils';
import { useResource } from '@/shared/query';

import {
  type EvidenceContentRequestParams,
  type EvidenceRequestParams,
  type EvidenceSummaryRequestParams,
  type PeriodsRequestParams,
  type RequestRefendumsParams,
  evidenceContentResource,
  evidencePeriodResource,
  evidenceResource,
  evidenceSummaryResource,
  evidenceToReferendumRelationsResource,
} from './resource';

export const useEvidences = (params: NullableMap<EvidenceRequestParams>) => {
  return useResource(evidenceResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: [],
    map(cache, { palletType, api, accounts }) {
      const list = cache[palletType]?.[api.genesisHash.toHex()];
      if (list) {
        return list.filter(e => accounts.includes(e.accountId));
      }
    },
  });
};

export const useEvidencesContent = (params: NullableMap<EvidenceContentRequestParams>) => {
  return useResource(evidenceContentResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: null,
    map(cache, { palletType, chainId, accountId }) {
      const list = cache[palletType]?.[chainId];
      if (list) {
        return list.find(e => e.accountId === accountId);
      }
    },
  });
};

export const useEvidencePeriod = (params: NullableMap<PeriodsRequestParams>) => {
  return useResource(evidencePeriodResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: null,
    map: (cache, { palletType, chain }) => cache[palletType]?.[chain.chainId],
  });
};

export const useEvidenceSummary = (params: NullableMap<EvidenceSummaryRequestParams>) => {
  return useResource(evidenceSummaryResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: null,
    map(cache, { palletType, chainId, accountId }) {
      const list = cache[palletType]?.[chainId];
      if (list) {
        return list.find(e => e.accountId === accountId);
      }
    },
  });
};

export const useEvidenceToReferendumRelations = (params: NullableMap<RequestRefendumsParams>) => {
  return useResource(evidenceToReferendumRelationsResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: [],
    map: (cache, { palletType, chain }) => cache[palletType]?.[chain.chainId],
  });
};
