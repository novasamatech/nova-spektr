import { BN } from '@polkadot/util';
import { combine } from 'effector';

import { votingService } from '@entities/governance';
import { votingAssetModel } from '../model/votingAsset';

import { votingAggregate } from './voting';

const $totalDelegations = combine(
  {
    voting: votingAggregate.$activeWalletVotes,
  },
  ({ voting }): string => {
    return Object.values(voting)
      .reduce((acc, value) => {
        const voting = Object.values(value).find(votingService.isDelegating);

        return voting ? acc.iadd(voting.delegating.balance) : acc;
      }, new BN(0))
      .toString();
  },
);

export const delegationModel = {
  $isLoading: votingAggregate.$isLoading,
  $asset: votingAssetModel.$votingAsset,
  $totalDelegations,
};
