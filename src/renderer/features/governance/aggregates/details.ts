import { combine, sample } from 'effector';
import { createGate } from 'effector-react';

import { type Chain, type Referendum } from '@/shared/core';
import { permissionUtils, walletModel } from '@/entities/wallet';
import { descriptionsModel } from '../model/description';
import { networkSelectorModel } from '../model/networkSelector';
import { timelineModel } from '../model/timeline';
import { titleModel } from '../model/title';

import { proposerIdentityAggregate } from './proposerIdentity';
import { votingAggregate } from './voting';

const flow = createGate<{ chain: Chain; referendum: Referendum }>();

const $canVote = walletModel.$activeWallet.map((wallet) => (wallet ? permissionUtils.canVote(wallet) : false));

const $titles = combine(
  {
    titles: titleModel.$titles,
    network: networkSelectorModel.$network,
  },
  ({ titles, network }) => (network ? (titles[network.chain.chainId] ?? {}) : {}),
);

sample({
  clock: flow.open,
  target: [
    proposerIdentityAggregate.events.requestReferendumProposer,
    descriptionsModel.events.requestDescription,
    timelineModel.events.requestTimeline,
  ],
});

export const detailsAggregate = {
  $descriptions: descriptionsModel.$descriptions,
  $timelines: timelineModel.$currentChainTimelines,
  $votes: votingAggregate.$activeWalletVotes,
  $proposers: proposerIdentityAggregate.$proposers,

  $isTitlesLoading: titleModel.$isTitlesLoading,
  $isTimelinesLoading: timelineModel.$isLoading,
  $isProposersLoading: proposerIdentityAggregate.$isProposersLoading,
  $isDescriptionLoading: descriptionsModel.$isDescriptionLoading,
  $hasAccount: networkSelectorModel.$hasAccount,

  $titles,
  $canVote,

  gates: { flow },
};
