import { combine } from 'effector';
import { BN } from '@polkadot/util';

import { votingAggregate } from '../aggregates/voting';
import { networkSelectorModel } from './networkSelector';
import { DelegatingVoting, VotingType } from '@shared/core';

const $totalDelegations = combine(
  {
    voting: votingAggregate.$currentWalletVoting,
  },
  ({ voting }): string => {
    return Object.values(voting)
      .reduce<BN>((acc, value) => {
        const voting = Object.values(value).find((v) => v.type === VotingType.DELEGATING);

        return voting ? acc.add((voting as DelegatingVoting).delegating.balance) : acc;
      }, new BN(0))
      .toString();
  },
);

const $asset = combine(
  {
    chain: networkSelectorModel.$governanceChain,
  },
  ({ chain }) => {
    return chain?.assets[0];
  },
  {
    skipVoid: false,
  },
);

export const delegationModel = {
  $isLoading: votingAggregate.events.requestPending,
  $asset,
  $totalDelegations,
};
