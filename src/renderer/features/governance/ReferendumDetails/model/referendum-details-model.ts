import { createStore, createEffect, sample } from 'effector';
import { createGate } from 'effector-react';

import type { Chain, ChainId, Referendum, ReferendumId } from '@shared/core';
import { IGovernanceApi } from '@shared/api/governance';
import { governanceModel } from '@entities/governance';
import { pickNestedValue, setNestedValue } from '@shared/lib/utils';

const flow = createGate<{ chain: Chain; referendum: Referendum }>();

const $offChainDetails = createStore<Record<ChainId, Record<ReferendumId, string>>>({});

type OffChainParams = {
  service: IGovernanceApi;
  chain: Chain;
  index: ReferendumId;
};

const requestOffChainDetailsFx = createEffect(
  ({ service, chain, index }: OffChainParams): Promise<string | undefined> => {
    return service.getReferendumDetails(chain, index);
  },
);

sample({
  clock: flow.open,
  source: {
    api: governanceModel.$governanceApi,
    details: $offChainDetails,
  },
  filter: ({ api, details }, { referendum, chain }) =>
    !!api && !pickNestedValue(details, chain.chainId, referendum.referendumId),
  fn: ({ api }, { chain, referendum }) => ({
    chain,
    service: api!.service,
    index: referendum.referendumId,
  }),
  target: requestOffChainDetailsFx,
});

sample({
  clock: requestOffChainDetailsFx.done,
  source: $offChainDetails,
  fn: (details, { params, result }) => setNestedValue(details, params.chain.chainId, params.index, result ?? ''),
  target: $offChainDetails,
});

export const referendumDetailsModel = {
  $offChainDetails,
  $isDetailsLoading: requestOffChainDetailsFx.pending,

  input: { flow },
};
