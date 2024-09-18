import { type ReferendumId } from '@/shared/pallet/referenda';
import { polkassemblyApiService } from '@shared/api/polkassembly';
import { type ChainId } from '@shared/core';
import { createDataSource } from '@shared/effector';
import { pickNestedValue, setNestedValue } from '@shared/lib/utils';
import { type CollectivePalletsType, type CollectivesStruct } from '../../lib/types';

import { type ReferendumMeta } from './types';

type RequestParams = {
  palletType: CollectivePalletsType;
  chainId: ChainId;
};

const { $: $list } = createDataSource<
  CollectivesStruct<Record<ReferendumId, ReferendumMeta>>,
  RequestParams,
  Record<ReferendumId, ReferendumMeta>
>({
  initial: {},
  fn: async () => {
    // TODO implement
    const a = await polkassemblyApiService
      .fetchPostsList({
        network: 'collectives',
        proposalType: 'fellowship_referendums',
      })
      .catch(console.error);

    console.log(a);

    return {};
  },
  map: (store, { params, result }) => {
    const currectValue = pickNestedValue(store, params.palletType, params.chainId);

    return setNestedValue(store, params.palletType, params.chainId, {
      ...(currectValue ?? {}),
      ...result,
    });
  },
});

export const referendumMetaModel = {
  $list,
};
