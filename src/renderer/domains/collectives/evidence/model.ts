import { type ApiPromise } from '@polkadot/api';

import { type Chain, type ChainId, type HexString } from '@/shared/core';
import { createDataSource, populated } from '@/shared/effector';
import { merge, nullable, pickNestedValue, setNestedValue } from '@/shared/lib/utils';
import { collectiveCorePallet } from '@/shared/pallet/collectiveCore';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type CollectivePalletsType, type CollectivesStruct } from '../_lib/types';

import { fetchEvidenceFromSubsquare, fetchEvidenceSummary } from './resource';
import { evidenceService } from './service';
import { type Evidence, type EvidencePeriods, type EvidenceSummary } from './types';

type EvidenceStore = CollectivesStruct<Evidence[]>;

type EvidenceRequestParams = {
  palletType: CollectivePalletsType;
  api: ApiPromise;
  chainId: ChainId;
  accountId: AccountId;
};

const { $: $list, request } = createDataSource({
  initial: {} as EvidenceStore,
  async fn({ palletType, api, accountId }: EvidenceRequestParams): Promise<Evidence | null> {
    const evidence = await collectiveCorePallet.storage.memberEvidence(palletType, api, accountId);

    if (evidence) {
      const content = await fetchEvidenceFromSubsquare(evidence.value);

      return {
        wish: evidence.wish,
        accountId,
        cid: evidenceService.getCidByEvidence(evidence.value),
        hash: evidence.value,
        content,
      };
    }

    return null;
  },
  map(source, { params, result }) {
    const list = pickNestedValue(source, params.palletType, params.chainId) ?? [];

    if (nullable(result)) {
      const filtered = list.filter(x => x.accountId !== params.accountId);
      return setNestedValue(source, params.palletType, params.chainId, filtered);
    }

    const merged = merge({
      a: list,
      b: [result],
      mergeBy: e => e.accountId,
    });

    return setNestedValue(source, params.palletType, params.chainId, merged);
  },
});

const $populated = populated(request);

type PeriodsStore = CollectivesStruct<EvidencePeriods>;

type PeriodsRequestParams = {
  palletType: CollectivePalletsType;
  api: ApiPromise;
  chain: Chain;
};

const { $: $periods, request: requestPeriods } = createDataSource({
  initial: {} as PeriodsStore,
  cache(params: PeriodsRequestParams, store) {
    return pickNestedValue(store, params.palletType, params.chain.chainId) ?? false;
  },
  async fn({ api, palletType }: PeriodsRequestParams): Promise<EvidencePeriods> {
    const params = await collectiveCorePallet.storage.params(palletType, api);

    return {
      minPromotionPeriod: params.minPromotionPeriod,
      demotionPeriod: params.demotionPeriod,
      offboardTimeout: params.offboardTimeout,
    };
  },
  map(store, { params, result }) {
    return setNestedValue(store, params.palletType, params.chain.chainId, result);
  },
});

type EvidenceSummmaryStore = CollectivesStruct<EvidenceSummary[]>;

type EvidenceSummaryRequestParams = {
  palletType: CollectivePalletsType;
  chainId: ChainId;
  evidence: HexString;
  accountId: AccountId;
  /**
   * User github name
   */
  githubHandle?: string;
  /**
   * Date string YYYY-MM-DD
   */
  evidencePeriodStart?: string | null;
};

const { $: $summary, request: requestSummary } = createDataSource({
  initial: {} as EvidenceSummmaryStore,
  async fn({
    accountId,
    evidence,
    chainId,
    githubHandle,
    evidencePeriodStart,
  }: EvidenceSummaryRequestParams): Promise<EvidenceSummary> {
    const evidenceSummary = await fetchEvidenceSummary(evidence, chainId, 'en', githubHandle, evidencePeriodStart);

    return {
      accountId,
      hash: evidence,
      summary: evidenceSummary.summary ?? '',
      github: evidenceSummary
        ? {
            pullRequests: evidenceSummary.numberOfPullRequests ?? null,
            mergedPullRequests: evidenceSummary.numberOfMergedPullRequests ?? null,
          }
        : null,
    };
  },
  map(source, { params, result }) {
    const prev = pickNestedValue(source, params.palletType, params.chainId) ?? [];
    const merged = merge({
      a: prev,
      b: [result],
      mergeBy: e => e.hash,
    });

    return setNestedValue(source, params.palletType, params.chainId, merged);
  },
});

export const evidence = {
  $list,
  $populated,
  $periods,
  $summary,
  request,
  requestPeriods,
  requestSummary,
};
