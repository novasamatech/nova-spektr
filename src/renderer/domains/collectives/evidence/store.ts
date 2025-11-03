import { createStore } from 'effector';
import { not, or, readonly } from 'patronum';

import { populated } from '@/shared/effector';
import { merge, pickNestedValue, setNestedValue } from '@/shared/lib/utils';
import { deriveFromResources } from '@/shared/resource';
import { mergeNested } from '../_lib/helpers';
import { type CollectivesStruct } from '../_lib/types';

import {
  evidenceContentResource,
  evidencePeriodResource,
  evidenceResource,
  evidenceSummaryResource,
  evidenceToReferendumRelationsResource,
} from './resource';
import {
  type Evidence,
  type EvidenceContent,
  type EvidencePeriods,
  type EvidenceSummary,
  type EvidenceToReferendumRelation,
} from './types';

const $list = createStore<CollectivesStruct<Evidence[]>>({});

deriveFromResources({
  store: $list,
  resources: [evidenceResource],
  map(state, evidences) {
    return mergeNested(state, evidences, e => e.accountId);
  },
});

const $content = createStore<CollectivesStruct<EvidenceContent[]>>({});

deriveFromResources({
  store: $content,
  resources: [evidenceContentResource],
  map(state, evidence) {
    if (evidence === null) return state;
    const prev = pickNestedValue(state, evidence.pallet, evidence.chainId) ?? [];
    const merged = merge({
      a: prev,
      b: [evidence],
      mergeBy: e => [e.pallet, e.chainId, e.accountId],
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

const summaryFulfilled = or(not(populated(evidenceResource.request)), evidenceSummaryResource.request.pending);

const $evidenceToReferendumRelations = createStore<CollectivesStruct<EvidenceToReferendumRelation[]>>({});

deriveFromResources({
  store: $evidenceToReferendumRelations,
  resources: [evidenceToReferendumRelationsResource],
  map(state, relations) {
    return mergeNested(state, relations, r => r.index);
  },
});

const $evidenceToReferendumRelationsPopulated = populated(evidenceToReferendumRelationsResource.request);

export const evidence = {
  $list: readonly($list),
  $content: readonly($content),
  $populated: readonly($populated),
  $periods: readonly($periods),
  $summary: readonly($summary),
  $evidenceToReferendumRelations: readonly($evidenceToReferendumRelations),
  $evidenceToReferendumRelationsPopulated: readonly($evidenceToReferendumRelationsPopulated),
  request: evidenceResource.request,
  requestContent: evidenceContentResource.request,
  requestPeriods: evidencePeriodResource.request,
  requestSummary: evidenceSummaryResource.request,
  requestEvidenceToReferendumRelations: evidenceToReferendumRelationsResource.request,
  summaryFulfilled,
  pendingSummary: evidenceSummaryResource.request,
};
