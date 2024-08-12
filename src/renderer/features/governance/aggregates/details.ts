import { sample } from 'effector';
import { createGate } from 'effector-react';

import { type Chain, type Referendum } from '@shared/core';
import { permissionUtils, walletModel } from '@entities/wallet';
import { descriptionsModel } from '../model/description';
import { timelineModel } from '../model/timeline';
import { titleModel } from '../model/title';
import { votingAssetModel } from '../model/votingAsset';

import { proposerIdentityAggregate } from './proposerIdentity';
import { votingAggregate } from './voting';

const flow = createGate<{ chain: Chain; referendum: Referendum }>();

const $canVote = walletModel.$activeWallet.map((wallet) => (wallet ? permissionUtils.canVote(wallet) : false));

sample({
  clock: flow.open,
  target: [proposerIdentityAggregate.events.requestReferendumProposer, descriptionsModel.events.requestDescription],
});

sample({
  clock: flow.open,
  fn: ({ referendum }) => ({ referendum }),
  target: timelineModel.events.requestTimeline,
});

export const detailsAggregate = {
  $votingAsset: votingAssetModel.$votingAsset,
  $descriptions: descriptionsModel.$descriptions,
  $titles: titleModel.$referendumTitles,
  $timelines: timelineModel.$currentChainTimelines,
  $votes: votingAggregate.$activeWalletVotes,
  $proposers: proposerIdentityAggregate.$proposers,

  $isTitlesLoading: titleModel.$isTitlesLoading,
  $isTimelinesLoading: timelineModel.$isLoading,
  $isProposersLoading: proposerIdentityAggregate.$isProposersLoading,
  $isDescriptionLoading: descriptionsModel.$isDescriptionLoading,

  $canVote,

  gates: { flow },
};
