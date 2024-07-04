import { createStore, createEffect, sample } from 'effector';
import { createGate } from 'effector-react';

import type { Chain, ChainId, Referendum, ReferendumId } from '@shared/core';
import { IGovernanceApi } from '@shared/api/governance';
import { governanceModel } from '@entities/governance';
import { pickNestedValue, setNestedValue } from '@shared/lib/utils';
import { proposerIdentityModel } from '../../../model/proposer-identity-model';
import { votingAssetsModel } from '../../../model/voting-assets-model';
import { titleModel } from '../../../model/title-model';

const flow = createGate<{ chain: Chain; referendum: Referendum }>();

const $descriptions = createStore<Record<ChainId, Record<ReferendumId, string>>>({});

type OffChainParams = {
  service: IGovernanceApi;
  chain: Chain;
  index: ReferendumId;
};

const requestOffChainDetailsFx = createEffect(({ service, chain, index }: OffChainParams) => {
  return service.getReferendumDetails(chain, index);
});

sample({
  clock: flow.open,
  target: proposerIdentityModel.events.requestProposer,
});

sample({
  clock: flow.open,
  source: {
    api: governanceModel.$governanceApi,
    details: $descriptions,
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
  source: $descriptions,
  fn: (details, { params, result }) => setNestedValue(details, params.chain.chainId, params.index, result ?? ''),
  target: $descriptions,
});

export const referendumDetailsModel = {
  $descriptions,
  $titles: titleModel.$titles,
  $votingAssets: votingAssetsModel.$votingAssets,
  $proposers: proposerIdentityModel.$proposers,
  $isProposersLoading: proposerIdentityModel.$isProposersLoading,
  $isDetailsLoading: requestOffChainDetailsFx.pending,

  gates: { flow },
};
