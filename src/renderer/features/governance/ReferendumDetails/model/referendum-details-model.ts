import { createStore, createEvent, createEffect, sample, combine } from 'effector';
import markdownit from 'markdown-it';
import { spread } from 'patronum';

import type { ChainId, ReferendumId } from '@shared/core';
import { IGovernanceApi } from '@shared/api/governance';
import { governanceModel } from '@entities/governance';

const flowStarted = createEvent<{ chainId: ChainId; index: ReferendumId }>();
const flowClosed = createEvent();

const $index = createStore<ReferendumId | null>(null).reset(flowClosed);
const $chainId = createStore<ChainId | null>(null).reset(flowClosed);
const $isFlowStarted = createStore<boolean>(false).reset(flowClosed);
const $offChainDetails = createStore<string | null>(null).reset(flowClosed);

const $referendum = combine(
  {
    index: $index,
    ongoing: governanceModel.$ongoingReferendums,
  },
  ({ index, ongoing }) => {
    if (!index || !ongoing.has(index)) return null;

    return ongoing.get(index) || null;
  },
);

type OffChainParams = {
  service: IGovernanceApi;
  chainId: ChainId;
  index: string;
};

const requestOffChainDetailsFx = createEffect(
  ({ service, chainId, index }: OffChainParams): Promise<string | undefined> => {
    return service.getReferendumDetails(chainId, index);
  },
);

const parseMarkdownFx = createEffect((value: string): string => {
  const html = markdownit({ html: true, breaks: true }).render(value);

  // remove noxious tags
  return html.replace(/<font[^>]*>|<\/font>/g, '');
});

sample({
  clock: flowStarted,
  fn: ({ chainId, index }) => ({ chainId, index, started: true }),
  target: spread({
    chainId: $chainId,
    index: $index,
    started: $isFlowStarted,
  }),
});

sample({
  clock: flowStarted,
  source: governanceModel.$governanceApi,
  filter: (governanceApi) => Boolean(governanceApi),
  fn: (governanceApi, { chainId, index }) => ({
    service: governanceApi!.service,
    chainId,
    index,
  }),
  target: requestOffChainDetailsFx,
});

sample({
  clock: requestOffChainDetailsFx.doneData,
  filter: (details): details is string => Boolean(details),
  target: parseMarkdownFx,
});

sample({
  clock: parseMarkdownFx.doneData,
  target: $offChainDetails,
});

export const referendumDetailsModel = {
  $index,
  $referendum,
  $offChainDetails,
  $isFlowStarted,
  $isDetailsLoading: requestOffChainDetailsFx.pending,

  input: {
    flowStarted,
  },
  output: {
    flowClosed,
  },
};
