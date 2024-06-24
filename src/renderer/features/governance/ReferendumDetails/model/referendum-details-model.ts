import { createStore, createEvent, createEffect, sample } from 'effector';
import markdownit from 'markdown-it';

import type { ChainId, ReferendumId } from '@shared/core';
import { IGovernanceApi } from '@shared/api/governance';
import { governanceModel } from '@entities/governance';

const flowStarted = createEvent<{ chainId: ChainId; index: ReferendumId }>();
const flowFinished = createEvent();

const $details = createStore<string | null>(null).reset(flowFinished);

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
  source: governanceModel.$governanceApi,
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
  target: $details,
});

export const referendumDetailsModel = {
  $details,
  input: {
    flowStarted,
  },
  output: {
    flowFinished,
  },
};
