import { createEffect, createEvent, createStore, sample, split } from 'effector';
import { createGate } from 'effector-react';
import { readonly } from 'patronum';

import { type GovernanceApi } from '@shared/api/governance';
import { type Chain, type ChainId, type Referendum, type ReferendumId, type Tally } from '@shared/core';
import { nonNullable, setNestedValue } from '@shared/lib/utils';
import { governanceModel, referendumService } from '@entities/governance';

const flow = createGate<{ chain: Chain; referendum: Referendum }>();

const $votingSummary = createStore<Record<ChainId, Record<ReferendumId, Tally>>>({});

type RequestParams = {
  chain: Chain;
  referendum: Referendum;
  api: GovernanceApi;
};

const requestSummary = createEvent<RequestParams>();
const mapFromOngoing = createEvent<RequestParams>();
const requestOffChain = createEvent<RequestParams>();

const requestOffChainSummaryFx = createEffect(({ api, chain, referendum }: RequestParams) => {
  return api.getReferendumSummary(chain, referendum.referendumId);
});

split({
  source: requestSummary,
  match: ({ referendum }) => (referendumService.isOngoing(referendum) ? 'ongoing' : 'completed'),
  cases: {
    ongoing: mapFromOngoing,
    completed: requestOffChain,
  },
});

sample({
  clock: mapFromOngoing,
  source: $votingSummary,
  fn: (summary, { referendum, chain }) => {
    if (!referendumService.isOngoing(referendum)) {
      return summary;
    }

    return setNestedValue(summary, chain.chainId, referendum.referendumId, referendum.tally);
  },
  target: $votingSummary,
});

sample({
  clock: requestOffChain,
  target: requestOffChainSummaryFx,
});

sample({
  clock: requestOffChainSummaryFx.done,
  source: $votingSummary,
  fn: (summary, { params, result }) => {
    return setNestedValue(summary, params.chain.chainId, params.referendum.referendumId, result);
  },
  target: $votingSummary,
});

sample({
  clock: flow.open,
  source: governanceModel.$governanceApi,
  filter: nonNullable,
  fn: (api, { chain, referendum }) => ({
    api: api!.service,
    chain,
    referendum,
  }),
  target: requestSummary,
});

export const votingSummaryModel = {
  $votingSummary: readonly($votingSummary),

  events: {
    requestSummary,
  },

  gates: {
    flow,
  },
};
