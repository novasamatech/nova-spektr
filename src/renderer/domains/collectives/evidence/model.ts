import { type ApiPromise } from '@polkadot/api';

import { type Chain } from '@/shared/core';
import { createDataSource } from '@/shared/effector';
import { nullable, pickNestedValue, setNestedValue } from '@/shared/lib/utils';
import { collectiveCorePallet } from '@/shared/pallet/collectiveCore';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type CollectivePalletsType, type CollectivesStruct } from '../_lib/types';

import { fetchEvidenceFromSubsquare, fetchEvidenceSummary } from './resource';
import { evidenceService } from './service';
import { type Evidence, type EvidencePeriods } from './types';

type EvidenceStore = CollectivesStruct<Evidence[]>;

type EvidenceRequestParams = {
  palletType: CollectivePalletsType;
  api: ApiPromise;
  chain: Chain;
  accountId: AccountId;
};

const { $: $list, request } = createDataSource({
  initial: {} as EvidenceStore,
  async fn({ palletType, api, chain, accountId }: EvidenceRequestParams): Promise<Evidence | null> {
    const evidence = await collectiveCorePallet.storage.memberEvidence(palletType, api, accountId);

    if (evidence) {
      const [content, summary] = await Promise.allSettled([
        fetchEvidenceFromSubsquare(evidence.value),
        fetchEvidenceSummary(evidence.value, chain.chainId, 'en'),
      ]).then(
        ([contentResponse, summaryResponse]) =>
          [
            contentResponse.status === 'fulfilled' ? contentResponse.value : '',
            summaryResponse.status === 'fulfilled' ? summaryResponse.value : '',
          ] as const,
      );

      return {
        wish: evidence.wish,
        accountId,
        cid: evidenceService.getCidByEvidence(evidence.value),
        hash: evidence.value,
        content,
        summary,
      };
    }

    return null;
  },
  map(source, { params, result }) {
    const list = pickNestedValue(source, params.palletType, params.chain.chainId) ?? [];

    if (nullable(result)) {
      const filtered = list.filter(x => x.accountId !== params.accountId);
      return setNestedValue(source, params.palletType, params.chain.chainId, filtered);
    }

    return setNestedValue(source, params.palletType, params.chain.chainId, list.concat(result));
  },
});

type PeriodsStore = CollectivesStruct<EvidencePeriods>;

type PeriodsRequestParams = {
  palletType: CollectivePalletsType;
  api: ApiPromise;
  chain: Chain;
};

const { $: $periods, request: requestPeriods } = createDataSource({
  initial: {} as PeriodsStore,
  filter(params: PeriodsRequestParams, store) {
    return nullable(pickNestedValue(store, params.palletType, params.chain.chainId));
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

export const evidence = {
  $list,
  $periods,
  request,
  requestPeriods,
};
