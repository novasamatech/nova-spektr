import { createStore, createEvent, createEffect, restore, sample, combine } from 'effector';
import { ApiPromise } from '@polkadot/api';
import { spread } from 'patronum';
import { isEmpty } from 'lodash';

import { ReferendumInfo, ChainId } from '@shared/core';
import { IGovernanceApi, governanceService, subsquareService } from '@shared/api/governance';
import { networkModel } from '@entities/network';

const chainIdChanged = createEvent<ChainId>();
const governanceApiChanged = createEvent<IGovernanceApi>();

const $chainId = restore(chainIdChanged, null);
const $governanceApi = restore(governanceApiChanged, subsquareService);

const $referendumsList = createStore<ReferendumInfo[]>([]);
const $referendumsDetails = createStore<Record<string, string> | null>(null);
const $referendumsRequested = createStore<boolean>(false);

const requestOnChainReferendumsFx = createEffect(async (api: ApiPromise): Promise<ReferendumInfo[]> => {
  console.log('=== request');
  const { ongoing } = await governanceService.getReferendums(api);

  return ongoing;
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

const getVotesFx = createEffect((api: ApiPromise): Promise<any[]> => {
  return governanceService.getVotesFor(api, '12mP4sjCfKbDyMRAEyLpkeHeoYtS5USY4x34n9NMwQrcEyoh');
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
    referendums: $referendumsList,
    requested: $referendumsRequested,
  }),
});

sample({
  clock: requestOnChainReferendumsFx.doneData,
  source: {
    chainId: $chainId,
    referendums: $referendumsList,
    service: $governanceApi,
  },
  filter: ({ chainId, referendums, service }) => {
    return Boolean(chainId) && referendums.length > 0 && Boolean(service);
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

sample({
  clock: requestOnChainReferendumsFx.doneData,
  source: $api,
  fn: (api) => api!,
  target: getVotesFx,
});

getVotesFx.doneData.watch((x) => {
  console.log('=== votes', x);
});

export const referendumListModel = {
  $referendumsList,
  $referendumsDetails,

  events: {
    chainIdChanged,
    governanceApiChanged,
  },
};
