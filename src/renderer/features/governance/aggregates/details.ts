import { sample } from 'effector';
import { createGate } from 'effector-react';

import { type Chain, type Referendum } from '@shared/core';
import { descriptionsModel } from '../model/description';
import { timelineModel } from '../model/timeline';
import { titleModel } from '../model/title';
import { votingAssetModel } from '../model/votingAsset';

import { proposerIdentityAggregate } from './proposerIdentity';
import { votingAggregate } from './voting';

const flow = createGate<{ chain: Chain; referendum: Referendum }>();

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
  $votingAsset: votingAssetModel.$votingAsset,
  $descriptions: descriptionsModel.$descriptions,
  $titles: titleModel.$referendumTitles,
  $timelines: timelineModel.$currentChainTimelines,
  $votes: votingAggregate.$activeWalletVotes,
  $proposers: proposerIdentityAggregate.$proposers,
  $isTimelinesLoading: timelineModel.$isTimelineLoading,
  $isProposersLoading: proposerIdentityAggregate.$isProposersLoading,
  $isDescriptionLoading: descriptionsModel.$isDescriptionLoading,

  gates: { flow },
};
