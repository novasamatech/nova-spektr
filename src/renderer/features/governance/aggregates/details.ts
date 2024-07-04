import { sample } from 'effector';
import { createGate } from 'effector-react';

import type { Chain, Referendum } from '@shared/core';
import { proposerIdentityAggregate } from './proposer-identity';
import { networkSelectorModel } from '../model/network-selector-model';
import { descriptionsModel } from '../model/descriptions-model';
import { titleModel } from '../model/title-model';

const flow = createGate<{ chain: Chain; referendum: Referendum }>();

const $votingAssets = networkSelectorModel.$governanceChains.map((chains) => {
  return Object.fromEntries(chains.map((chain) => [chain.chainId, chain.assets.at(0) ?? null]));
});

sample({
  clock: flow.open,
  target: [proposerIdentityAggregate.events.requestProposer, descriptionsModel.events.requestDescription],
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
