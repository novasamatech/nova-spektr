import { createStore, createEvent, createEffect, restore, sample, combine } from 'effector';
import { ApiPromise } from '@polkadot/api';
import { spread } from 'patronum';
import isEmpty from 'lodash/isEmpty';

import { ReferendumInfo, ChainId, ReferendumId, ReferendumType } from '@shared/core';
import { IGovernanceApi, governanceService, polkassemblyService } from '@shared/api/governance';
import { networkModel } from '@entities/network';

const chainIdChanged = createEvent<ChainId>();
const governanceApiChanged = createEvent<IGovernanceApi>();

const $chainId = restore(chainIdChanged, null);
const $governanceApi = restore(governanceApiChanged, polkassemblyService);

const $ongoingReferendums = createStore<Record<ReferendumId, ReferendumInfo>>({});
const $completedReferendums = createStore<Record<ReferendumId, ReferendumInfo>>({});
const $referendumsDetails = createStore<Record<ReferendumId, string>>({});
const $referendumsRequested = createStore<boolean>(false).reset(chainIdChanged);

const requestOnChainReferendumsFx = createEffect((api: ApiPromise): Promise<Record<ReferendumId, ReferendumInfo>> => {
  return governanceService.getReferendums(api);
});

type OffChainParams = {
  chainId: ChainId;
  service: IGovernanceApi;
};
const requestOffChainReferendumsFx = createEffect(
  ({ chainId, service }: OffChainParams): Promise<Record<string, string>> => {
    return service.getReferendumList(chainId);
  },
);

const $api = combine(
  {
    chainId: $chainId,
    apis: networkModel.$apis,
  },
  ({ chainId, apis }) => {
    return (chainId && apis[chainId]) || null;
  },
);

sample({
  clock: $api.updates,
  source: $referendumsRequested,
  filter: (referendumsRequested, api) => !referendumsRequested && Boolean(api),
  fn: (_, api) => api!,
  target: requestOnChainReferendumsFx,
});

sample({
  clock: requestOnChainReferendumsFx.doneData,
  fn: (referendums) => {
    const ongoing: Record<ReferendumId, ReferendumInfo> = {};
    const completed: Record<ReferendumId, ReferendumInfo> = {};

    for (const [index, referendum] of Object.entries(referendums)) {
      if (referendum.type === ReferendumType.Ongoing) {
        ongoing[index] = referendum;
      } else {
        completed[index] = referendum;
      }
    }

    return { ongoing, completed, requested: true };
  },
  target: spread({
    ongoing: $ongoingReferendums,
    completed: $completedReferendums,
    requested: $referendumsRequested,
  }),
});

sample({
  clock: requestOnChainReferendumsFx.doneData,
  source: {
    chainId: $chainId,
    service: $governanceApi,
  },
  filter: ({ chainId, service }, referendums) => {
    return Boolean(chainId) && !isEmpty(referendums) && Boolean(service);
  },
  fn: ({ chainId, service }) => {
    return { chainId: chainId!, service: service! };
  },
  target: requestOffChainReferendumsFx,
});

sample({
  clock: requestOffChainReferendumsFx.doneData,
  filter: (referendums) => !isEmpty(referendums),
  target: $referendumsDetails,
});

export const referendumListModel = {
  $ongoingReferendums,
  $completedReferendums,
  $referendumsDetails,

  events: {
    chainIdChanged,
    governanceApiChanged,
  },
};
