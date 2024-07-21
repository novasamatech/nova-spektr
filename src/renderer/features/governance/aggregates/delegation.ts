import { BN } from '@polkadot/util';
import { combine } from 'effector';

import { networkSelectorModel } from '../model/networkSelector';

import { votingAggregate } from './voting';

const $totalDelegations = combine(
  {
    voting: votingAggregate.$activeWalletVotes,
  },
  ({ voting }): string => {
    return Object.values(voting)
      .reduce<BN>((acc, value) => {
        const voting = Object.values(value).find((v) => v.type === 'delegating');

        return voting ? acc.add(voting.delegating.balance) : acc;
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
