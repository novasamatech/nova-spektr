import { sample } from 'effector';
import { createGate } from 'effector-react';

import type { Chain, Referendum } from '@shared/core';
import { proposerIdentityAggregate } from './proposerIdentity';
import { networkSelectorModel } from '../model/networkSelector';
import { descriptionsModel } from '../model/description';
import { titleModel } from '../model/title';
import { voteHistoryModel } from '@entities/governance';

const flow = createGate<{ chain: Chain; referendum: Referendum }>();

const $votingAssets = networkSelectorModel.$governanceChains.map((chains) => {
  return Object.fromEntries(chains.map((chain) => [chain.chainId, chain.assets.at(0) ?? null]));
});

sample({
  clock: flow.open,
  target: [proposerIdentityAggregate.events.requestProposer, descriptionsModel.events.requestDescription],
});

sample({
  clock: flow.open,
  fn: ({ chain, referendum }) => ({
    chain,
    referendumId: referendum.referendumId,
  }),
  target: voteHistoryModel.events.requestVoteHistory,
});

export const detailsAggregate = {
  $votingAssets,
  $descriptions: descriptionsModel.$descriptions,
  $titles: titleModel.$titles,
  $proposers: proposerIdentityAggregate.$proposers,
  $isProposersLoading: proposerIdentityAggregate.$isProposersLoading,
  $isDescriptionLoading: descriptionsModel.$isDescriptionLoading,

  gates: { flow },
};
