import { createStore, createEvent, createEffect, sample, restore } from 'effector';
import markdownit from 'markdown-it';

import { ChainId } from '@shared/core';
import { subsquareService, IGovernanceApi } from '@shared/api/governance';

const governanceApiChanged = createEvent<IGovernanceApi>();
const referendumChanged = createEvent<{ chainId: ChainId; index: string }>();
const flowFinished = createEvent();

const $governanceApi = restore(governanceApiChanged, subsquareService);
const $details = createStore<string | null>(null).reset(flowFinished);
// const $referendum = createStore<string>('').reset(flowFinished);

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
  clock: referendumChanged,
  source: $governanceApi,
  fn: (service, { chainId, index }) => ({ service, chainId, index }),
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
  events: {
    referendumChanged,
  },
  output: {
    flowFinished,
  },
};
