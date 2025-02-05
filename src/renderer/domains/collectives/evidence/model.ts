import { type ApiPromise } from '@polkadot/api';

import { type Chain } from '@/shared/core';
import { createDataSource } from '@/shared/effector';
import { nullable, pickNestedValue, setNestedValue } from '@/shared/lib/utils';
import { collectiveCorePallet } from '@/shared/pallet/collectiveCore';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type CollectivePalletsType, type CollectivesStruct } from '../_lib/types';

import { fetchEvidenceFromSubsquare } from './resource';
import { evidenceService } from './service';
import { type Evidence } from './types';

type Store = CollectivesStruct<Evidence[]>;

type RequestParams = {
  palletType: CollectivePalletsType;
  api: ApiPromise;
  chain: Chain;
  accountId: AccountId;
};

const { $: $list, request } = createDataSource({
  initial: {} as Store,
  async fn({ palletType, api, accountId }: RequestParams): Promise<Evidence | null> {
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
    if (nullable(result)) {
      return source;
    }

    const list = pickNestedValue(source, params.palletType, params.chain.chainId) ?? [];

    return setNestedValue(source, params.palletType, params.chain.chainId, list.concat(result));
  },
});

export const evidence = {
  $list,
  request,
};
