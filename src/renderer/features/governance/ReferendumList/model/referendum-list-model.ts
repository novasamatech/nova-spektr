import { createStore, createEvent, createEffect, restore, sample, combine } from 'effector';
import { ApiPromise } from '@polkadot/api';
import { spread } from 'patronum';

import { ReferendumInfo, ChainId } from '@shared/core';
import { IGovernanceApi, governanceService, subsquareService } from '@shared/api/governance';
import { networkModel } from '@entities/network';

const chainIdChanged = createEvent<ChainId>();
const governanceApiChanged = createEvent<IGovernanceApi>();

const $chainId = restore(chainIdChanged, null);
const $governanceApi = restore(governanceApiChanged, subsquareService);

const $referendums = createStore<ReferendumInfo[]>([]);
const $referendumsRequested = createStore<boolean>(false);

const requestOnChainReferendumsFx = createEffect(async (api: ApiPromise): Promise<ReferendumInfo[]> => {
  console.log('=== request');
  const { ongoing, rejected, approved } = await governanceService.getReferendums(api);

  return ongoing;
  // return [...ongoing, ...rejected, ...approved];
});

type OffChainParams = {
  chainId: ChainId;
  indices: number[];
  service: IGovernanceApi;
};
const requestOffChainReferendumsFx = createEffect(({ chainId, indices, service }: OffChainParams): Promise<any[]> => {
  return service.getReferendumList(chainId);
});

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
  clock: chainIdChanged,
  fn: (chainId) => ({ chainId, requested: false }),
  target: spread({
    chainId: $chainId,
    requested: $referendumsRequested,
  }),
});

sample({
  clock: $api.updates,
  source: $referendumsRequested,
  filter: (referendumsRequested, api) => !referendumsRequested && Boolean(api),
  fn: (_, api) => api!,
  target: requestOnChainReferendumsFx,
});

sample({
  clock: requestOnChainReferendumsFx.doneData,
  fn: (referendums) => ({ referendums, requested: true }),
  target: spread({
    referendums: $referendums,
    requested: $referendumsRequested,
  }),
});

sample({
  clock: requestOnChainReferendumsFx.doneData,
  source: {
    chainId: $chainId,
    referendums: $referendums,
    service: $governanceApi,
  },
  filter: ({ chainId, referendums, service }) => {
    return Boolean(chainId) && referendums.length > 0 && Boolean(service);
  },
  fn: ({ chainId, referendums, service }) => {
    // TODO: get required indices from referendums
    return { chainId: chainId!, indices: [], service: service! };
  },
  target: requestOffChainReferendumsFx,
});

// TODO: enrich referendums
// sample({
//   clock: requestOffChainReferendumsFx.doneData,
//   source: $referendums,
//   fn: (referendums) => referendums,
//   target: $referendums,
// });

export const referendumListModel = {
  $referendums,

  events: {
    chainIdChanged,
    governanceApiChanged,
  },
};
