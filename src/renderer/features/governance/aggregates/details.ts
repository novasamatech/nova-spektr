import { sample } from 'effector';
import { createGate } from 'effector-react';

import type { Chain, Referendum } from '@shared/core';
import { networkSelectorModel } from '../model/networkSelector';
import { descriptionsModel } from '../model/description';
import { titleModel } from '../model/title';
import { proposerIdentityAggregate } from './proposerIdentity';
import { timelineModel } from '../model/timeline';

const flow = createGate<{ chain: Chain; referendum: Referendum }>();

const $votingAssets = networkSelectorModel.$governanceChains.map((chains) => {
  return Object.fromEntries(chains.map((chain) => [chain.chainId, chain.assets.at(0) ?? null]));
});

sample({
  clock: flow.open,
  target: [proposerIdentityAggregate.events.requestReferendumProposer, descriptionsModel.events.requestDescription],
});

sample({
  clock: flow.open,
  fn: ({ referendum }) => ({ referendumId: referendum.referendumId }),
  target: timelineModel.events.requestTimeline,
});

export const detailsAggregate = {
  $votingAssets,
  $descriptions: descriptionsModel.$descriptions,
  $titles: titleModel.$titles,
  $timelines: timelineModel.$currentChainTimelines,
  $proposers: proposerIdentityAggregate.$proposers,
  $isTimelinesLoading: timelineModel.$isTimelineLoading,
  $isProposersLoading: proposerIdentityAggregate.$isProposersLoading,
  $isDescriptionLoading: descriptionsModel.$isDescriptionLoading,

  gates: { flow },
};
