import { createStore } from 'effector';

import { populated } from '@/shared/effector';
import { merge, pickNestedValue, setNestedValue } from '@/shared/lib/utils';
import { deriveFromResources } from '@/shared/resource';
import { type CollectivesStruct } from '../_lib/types';

import { evidencePeriodResource, evidenceResource, evidenceSummaryResource } from './resource';
import { type Evidence, type EvidencePeriods, type EvidenceSummary } from './types';

const $list = createStore<CollectivesStruct<Evidence[]>>({});

deriveFromResources({
  store: $list,
  resources: [evidenceResource],
  map(state, evidence) {
    if (evidence === null) return state;
    const prev = pickNestedValue(state, evidence.pallet, evidence.chainId) ?? [];
    const merged = merge({
      a: prev,
      b: [evidence],
      mergeBy: e => [e.chainId, e.accountId],
    });
    return setNestedValue(state, evidence.pallet, evidence.chainId, merged);
  },
});

const $populated = populated(evidenceResource.request);

const $periods = createStore<CollectivesStruct<EvidencePeriods>>({});

deriveFromResources({
  store: $periods,
  resources: [evidencePeriodResource],
  map(state, period) {
    return setNestedValue(state, period.pallet, period.chainId, period);
  },
});

const $summary = createStore<CollectivesStruct<EvidenceSummary[]>>({});

deriveFromResources({
  store: $summary,
  resources: [evidenceSummaryResource],
  map(state, summary) {
    const prev = pickNestedValue(state, summary.pallet, summary.chainId) ?? [];
    const merged = merge({
      a: prev,
      b: [summary],
      mergeBy: e => e.accountId,
    });

    return setNestedValue(state, summary.pallet, summary.chainId, merged);
  },
});

export const evidence = {
  $list,
  $populated,
  $periods,
  $summary,
  request: evidenceResource.request,
  requestPeriods: evidencePeriodResource.request,
  requestSummary: evidenceSummaryResource.request,
};
